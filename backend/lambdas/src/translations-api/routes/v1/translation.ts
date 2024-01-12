import {API, Request, Response} from 'lambda-api';
import {IRoute} from '../../../common/routes/IRoute';
import logger from "../../../common/logger";
import {TranslateClient, TranslateTextCommand} from "@aws-sdk/client-translate";
import {LanguageOption, supportedLanguagesMap} from "../../../common/utils";
import {
    AllTopics,
    AuthClient,
    CacheClient,
    CacheListFetch, CacheRole,
    CollectionTtl,
    ExpiresIn,
    GenerateDisposableToken,
    TopicClient,
    TopicPublish,
    TopicRole
} from "@gomomento/sdk";
import Filter from 'bad-words';
import * as crypto from 'crypto';
import {Rekognition} from '@aws-sdk/client-rekognition';
import {PostMessageEvent} from "../../../../../../shared/models";
import {ChatMessageEvent, MessageType, User} from "../../../shared/models";

const sentences: string[] = [
    "The sun is shining brightly.",
    "I enjoy reading books in the park.",
    "Coding is a fascinating skill to learn.",
    "My favorite color is blue.",
    "Coffee helps me stay awake during work.",
    "Cats are playful and adorable pets.",
    "Learning new things is always exciting.",
    "I like to take long walks in nature.",
    "Pizza is my go-to comfort food.",
    "Walking my dog is a daily routine.",
];

type Props = {
    translateClient: TranslateClient;
    topicClient: TopicClient;
    cacheClient: CacheClient;
    authClient: AuthClient;
    cache: string;
    baseTopicName: string;
    signingSecret: string;
}

type TranslationRequest = {
    cache: string;
    topic: string;
    event_timestamp: number;
    publish_timestamp: number;
    topic_sequence_number: number;
    token_id: string;
    text: string;
}

type CreateTokenRequest = User;
const profanityFilter = new Filter();

export class TranslationRoute implements IRoute {
    private readonly translateClient: TranslateClient;
    private readonly topicClient: TopicClient;
    private readonly authClient: AuthClient;
    private readonly cacheClient: CacheClient;
    private readonly cache: string;
    private readonly baseTopicName: string;
    private readonly signingSecret: string;
    constructor(props: Props) {
        this.translateClient = props.translateClient;
        this.topicClient = props.topicClient;
        this.cache = props.cache;
        this.baseTopicName = props.baseTopicName;
        this.authClient = props.authClient;
        this.cacheClient = props.cacheClient;
        this.signingSecret = props.signingSecret;
    }
    routes(): (api: API) => void {
        return (api: API): void => {
            api.post('', async (req: Request, res: Response) => {
                logger.info('received translation request', {
                    body: req.body,
                });
                if (!this.didRequestComeFromMomento(req)) {
                    logger.warn('unable to validate signing key');
                    return res.status(401).send({ message: 'unable to validate signing key' });
                }
                const body = req.body as TranslationRequest;
                const user = this.getUserFromTokenId(body.token_id);

                // try and filter first. This filter does not filter from all languages, but it's a good start
                const parsedMessage = JSON.parse(body.text) as PostMessageEvent;

                if (parsedMessage.message.startsWith("/random")) {
                    parsedMessage.message = sentences[Math.floor(Math.random() * sentences.length)];
                } else if (parsedMessage.message.startsWith("/stats")) {
                    const messagesAndUsersInLastHour = await this.getMessagesAndUsersInLastHour(parsedMessage.sourceLanguage);
                    parsedMessage.message = `Number of messages sent in the last hour: ${messagesAndUsersInLastHour.messages}\nNumber of unique users: ${messagesAndUsersInLastHour.uniqueUsers}`;
                }

                for (const lang of Object.keys(supportedLanguagesMap)) {
                    let translatedMessage: string;
                    let messageType: MessageType;
                    if (parsedMessage.messageType === MessageType.IMAGE) {
                        const image = await this.getBase64Image({imageId: parsedMessage.message});
                        const isImageSafe = await this.filterImageWithRekognition(image);
                        if (!isImageSafe) {
                            logger.warn('Image contains inappropriate content, skipping translation and publishing.');
                            translatedMessage = 'Image contains inappropriate content. Cannot publish translation.';
                            messageType = MessageType.TEXT;
                            await this.setUnsafeImage({ imageId: parsedMessage.message });
                        } else {
                            translatedMessage = parsedMessage.message;
                            messageType = MessageType.IMAGE;
                        }
                    } else {
                        const filteredMessage = this.filterProfanity(parsedMessage.message ?? '');
                        translatedMessage = await this.translateMessage({
                            targetLanguage: lang,
                            sourceLanguage: parsedMessage.sourceLanguage,
                            message: filteredMessage
                        });
                        messageType = MessageType.TEXT;
                    }

                    await this.publishTranslatedText({
                        user: {
                            username: user.username,
                            id: user.id,
                        },
                        sourceLanguage: lang,
                        message: translatedMessage,
                        messageType: messageType,
                        timestamp: parsedMessage.timestamp
                    });
                }

                return res.status(200).send({ message: 'success' });
            });
            api.get('latestMessages/:language', async (req: Request, res: Response) => {
                if (!(req.params && req.params.language)) {
                    return res.status(400).send({ message: 'missing required path param "language"'});
                }
                const listResp = await this.cacheClient.listFetch(this.cache, req.params.language);
                if (listResp instanceof CacheListFetch.Hit) {
                    const publishedMessages: ChatMessageEvent[] = [];
                    const listValues = listResp.valueListString();
                    for (const item of listValues) {
                        const messageToPublish = JSON.parse(item) as ChatMessageEvent;
                        if (messageToPublish.messageType === MessageType.IMAGE) {
                            messageToPublish.message = await this.getBase64Image({imageId: messageToPublish.message});
                        }
                        publishedMessages.push(messageToPublish);
                    }
                    return res.status(200).send({ messages: publishedMessages });
                } else if (listResp instanceof CacheListFetch.Miss) {
                    return res.status(200).send({ messages: [] });
                } else if (listResp instanceof CacheListFetch.Error) {
                    logger.error('failed to fetch previous message, returning empty list', {
                        message: listResp.message(),
                        core: listResp.errorCode(),
                        exception: listResp.innerException(),
                    })
                    return res.status(200).send({ messages: [] });
                }
                return res.status(500).send('failed to fetch previous messages');
            });
            api.get('languages', (req: Request, res: Response) => {
                const supportedLanguages: LanguageOption[] = Object.entries(
                    supportedLanguagesMap
                ).map(([value, label]) => ({ value, label }));

                logger.info('received request to get supported languages', {
                    supportedLanguagesMap
                });
                return res.status(200).send({ supportedLanguages});
            });
            api.post('token', async (req: Request, res: Response) => {
                logger.info('received request to get token for chat', {
                    username: req.body
                });
                const parsedBody = req.body as CreateTokenRequest;
                const permissions = {
                    permissions: [
                        {
                            role: CacheRole.ReadWrite,
                            cache: this.cache,
                            item: {keyPrefix: "image-"},
                        },
                        {
                            role: TopicRole.PublishSubscribe,
                            cache: this.cache,
                            topic: AllTopics,
                        },
                    ],
                }
                const tokenId = this.generateTokenId(parsedBody);
                const disposableTokenResp = await this.authClient.generateDisposableToken(permissions, ExpiresIn.minutes(5), { tokenId });
                if (disposableTokenResp instanceof GenerateDisposableToken.Success) {
                    return res.status(200).send({ token: disposableTokenResp.authToken, expiresAtEpoch: disposableTokenResp.expiresAt.epoch() });
                } else if (disposableTokenResp instanceof GenerateDisposableToken.Error) {
                    logger.error('failed to generate disposable token', {
                        code: disposableTokenResp.errorCode(),
                        message: disposableTokenResp.message(),
                        exception: disposableTokenResp.innerException(),
                    });
                    return res.status(500).send({ message: "unable to create token" });
                }
                logger.error('unknown error occurred when generating a disposable token', { resp: disposableTokenResp });
                return res.status(500).send({ message: 'unknown error occurred when generating a disposable token' });
            })
        };
    }

    private generateTopicName = (lang: string): string => {
        return `${this.baseTopicName}-${lang}`;
    }

    private generateTokenId = (user: User): string => {
        return `${user.id}:${user.username}`;
    }

    private getUserFromTokenId = (tokenId: string): User => {
        const username = tokenId.split(':')[1];
        const userId = tokenId.split(':')[0];
        return {
            username,
            id: userId
        }
    }

    private didRequestComeFromMomento = (req: Request): boolean => {
        const hash = crypto.createHmac("SHA3-256", this.signingSecret);
        const hashed = hash.update(req.rawBody).digest('hex');
        return hashed === req.headers['momento-signature'];
    }

    private translateMessage = async (props: { targetLanguage: string, message: string, sourceLanguage: string }): Promise<string> => {
        const translateReq = new TranslateTextCommand({
            SourceLanguageCode: 'auto',
            TargetLanguageCode: props.targetLanguage,
            Text: props.message,
            Settings: {
                Profanity: "MASK"
            }
        });
        logger.info('translating', {
            sourceLang: props.sourceLanguage,
            targetLang: props.targetLanguage,
        });
        const translateResp = await this.translateClient.send(translateReq);
        logger.info('translated response', {
            metadata: translateResp.$metadata,
            source: translateResp.SourceLanguageCode,
            target: translateResp.TargetLanguageCode,
            translatedText: translateResp.TranslatedText,
        });
        return translateResp.TranslatedText ?? '';
    }
    private publishTranslatedText = async (props: { user: User, timestamp: number, message: string, messageType: MessageType, sourceLanguage: string }) => {
        const topicName = this.generateTopicName(props.sourceLanguage);
        const messageToSend: ChatMessageEvent = {
            timestamp: props.timestamp,
            messageType: props.messageType,
            message: props.message,
            sourceLanguage: props.sourceLanguage,
            user: props.user,
        }
        logger.info('publishing translated text to topic', {
            topic: topicName,
            messageToSend,
        });
        const publishResp = await this.topicClient.publish(this.cache, topicName, JSON.stringify(messageToSend));
        if (publishResp instanceof TopicPublish.Success) {
            logger.info('successfully published translated text', {
                topic: topicName,
            });
        } else if (publishResp instanceof TopicPublish.Error) {
            logger.error('failed to published translated text, will try and publish the rest of the messages', {
                topic: topicName,
                message: publishResp.message(),
                exception: publishResp.innerException()
            });
        }
        const fourHoursInSeconds = 4 * 60 * 60;
        await this.cacheClient.listPushBack(this.cache, props.sourceLanguage, JSON.stringify(messageToSend), {
            truncateFrontToSize: 100,
            ttl: CollectionTtl.refreshTtlIfProvided(fourHoursInSeconds)
        });
    }

    // The profanity filtering library we are using only works for english words,
    // and throws errors when trying to filter non-english characters :sad:. This
    // is here so we only try and run the profanity filter against english chars
    private filterProfanity = (phrase: string): string => {
        try {
            return profanityFilter.clean(phrase);
        } catch (e) {
            logger.warn('failed to filter profanity, using unfiltered phrase', { error: e });
            return phrase;
        }
    }

    private async filterImageWithRekognition(imageBase64: string): Promise<boolean> {
        const rekognition = new Rekognition();
        const params = {
            Image: {
                Bytes: Buffer.from(imageBase64, 'base64')
            },
        };
        try {
            const response = await rekognition.detectModerationLabels(params);
            const moderationLabels = response.ModerationLabels;
            if (moderationLabels && moderationLabels.length > 0) {
                logger.warn('Detected moderation labels:', moderationLabels);
                // Return false to indicate that the image contains inappropriate content
                return false;
            }
            return true
        } catch (error) {
            logger.error('Error during Rekognition processing', { error });
            return false;
        }
    }

    private async getBase64Image({ imageId } : {imageId: string }): Promise<string> {
        return (await this.cacheClient.get(this.cache, imageId)).value() ?? '';
    }
    private async setUnsafeImage({ imageId } : {imageId: string }): Promise<void> {
        await this.cacheClient.set(this.cache, imageId, 'Image contains inappropriate content. Cannot publish translation.');
    }

    private async getMessagesAndUsersInLastHour(sourceLanguage: string): Promise<{ messages: number, uniqueUsers: number }> {
        const currentTime = Math.floor(Date.now() / 1000);
        const oneHourAgo = currentTime - 3600; // 3600 seconds in an hour

        const listResp = await this.cacheClient.listFetch(this.cache, sourceLanguage);
        if (listResp instanceof CacheListFetch.Hit) {
            const publishedMessages = listResp.valueListString().map(item => {
                return JSON.parse(item) as ChatMessageEvent;
            });

            const uniqueUsers = new Set<string>();
            let messagesInLastHour = 0;

            for (const message of publishedMessages) {
                if (message.timestamp >= oneHourAgo) {
                    uniqueUsers.add(message.user.id);
                    messagesInLastHour++;
                }
            }

            return { messages: messagesInLastHour, uniqueUsers: uniqueUsers.size };
        } else {
            return { messages: 0, uniqueUsers: 0 };
        }
    }
}
