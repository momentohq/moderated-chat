import {API, Request, Response} from 'lambda-api';
import {IRoute} from '../../../common/routes/IRoute';
import logger from "../../../common/logger";
import {TranslateClient, TranslateTextCommand} from "@aws-sdk/client-translate";
import {LanguageOption, supportedLanguagesMap} from "../../../common/utils";
import {
    AllTopics,
    AuthClient, CacheClient, CacheListFetch, CollectionTtl,
    DisposableTokenScopes,
    ExpiresIn, GenerateDisposableToken,
    TopicClient,
    TopicPublish
} from "@gomomento/sdk";
import Filter from 'bad-words';
import * as crypto from 'crypto';

type User = {
    id: string;
    username: string;
}

type Props = {
    translateClient: TranslateClient;
    topicClient: TopicClient;
    cacheClient: CacheClient;
    authClient: AuthClient;
    cache: string;
    baseTopicName: string;
    signingSecret: string;
}

type ParsedMessage = {
    messageType: MessageType;
    message: string;
    sourceLanguage: string;
    timestamp: number;
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
enum MessageType {
    TEXT = 'text',
    IMAGE = 'image',
}
type MessageToPublish = {
    messageType: MessageType
    message: string;
    sourceLanguage: string;
    timestamp: number;
    user: User;
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
                const parsedMessage = JSON.parse(body.text) as ParsedMessage;
                const filteredMessage = this.filterProfanity(parsedMessage.message ?? '');

                for (const lang of Object.keys(supportedLanguagesMap)) {
                    let translatedMessage: string;
                    if (parsedMessage.messageType === MessageType.IMAGE) {
                        console.log('message is an image, not translating');
                        translatedMessage = parsedMessage.message;
                    } else {
                        console.log('message is text, translating');
                        translatedMessage = await this.translateMessage({
                            targetLanguage: lang,
                            sourceLanguage: parsedMessage.sourceLanguage,
                            message: filteredMessage
                        });
                    }

                    await this.publishTranslatedText({
                        user: {
                            username: user.username,
                            id: user.id,
                        },
                        sourceLanguage: lang,
                        message: translatedMessage,
                        messageType: parsedMessage.messageType,
                        timestamp: parsedMessage.timestamp
                    });
                }

                return res.status(200).send({ message: 'success' });
            });
            api.get('latestMessages/:language', async (req: Request, res: Response) => {
                console.log('received request to get latest messages');
                if (!(req.params && req.params.language)) {
                    return res.status(400).send({ message: 'missing required path param "language"'});
                }
                const listResp = await this.cacheClient.listFetch(this.cache, req.params.language);
                if (listResp instanceof CacheListFetch.Hit) {
                    const publishedMessages = listResp.valueListString().map(item => {
                        const parsedItem = JSON.parse(item) as MessageToPublish;
                        if (parsedItem.messageType === MessageType.TEXT) {
                            return parsedItem;
                        } else {
                            const decodedImage = Buffer.from(parsedItem.message, 'base64').toString('utf-8');
                            return {
                                ...parsedItem,
                                message: decodedImage,
                            };
                        }
                    });
                    console.log('published messages', publishedMessages);
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
                const publishSubscribeScope = DisposableTokenScopes.topicPublishSubscribe(this.cache, AllTopics);
                const tokenId = this.generateTokenId(parsedBody);
                const disposableTokenResp = await this.authClient.generateDisposableToken(publishSubscribeScope, ExpiresIn.minutes(5), { tokenId });
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
        const messageToSend: MessageToPublish = {
            timestamp: props.timestamp,
            messageType: props.messageType,
            message: props.message,
            sourceLanguage: props.sourceLanguage,
            user: props.user,
        }
        console.log('message to send', messageToSend);
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
        console.log('successfully published message to cache');
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
}
