import {API, Request, Response} from 'lambda-api';
import {IRoute} from '../../../common/routes/IRoute';
import logger from "../../../common/logger";
import {TranslateClient, TranslateTextCommand} from "@aws-sdk/client-translate";
import {supportedLanguages} from "../../../common/utils";
import {
    AllTopics,
    AuthClient, CacheClient, CacheListFetch, CollectionTtl,
    DisposableTokenScopes,
    ExpiresIn, GenerateDisposableToken,
    TopicClient,
    TopicPublish
} from "@gomomento/sdk";
import {filter} from 'curse-filter';

type Props = {
    translateClient: TranslateClient;
    topicClient: TopicClient;
    cacheClient: CacheClient;
    authClient: AuthClient;
    cache: string;
    baseTopicName: string;
}

type ParsedMessage = {
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

type MessageToPublish = {
    message: string;
    sourceLanguage: string;
    timestamp: number;
    username: string;
}

export class TranslationRoute implements IRoute {
    private readonly translateClient: TranslateClient;
    private readonly topicClient: TopicClient;
    private readonly authClient: AuthClient;
    private readonly cacheClient: CacheClient;
    private readonly cache: string;
    private readonly baseTopicName: string;
    constructor(props: Props) {
        this.translateClient = props.translateClient;
        this.topicClient = props.topicClient;
        this.cache = props.cache;
        this.baseTopicName = props.baseTopicName;
        this.authClient = props.authClient;
        this.cacheClient = props.cacheClient;
    }
    routes(): (api: API) => void {
        return (api: API): void => {
            api.post('', async (req: Request, res: Response) => {
                logger.info('received translation request', {
                    body: req.body,
                })
                const body = req.body as TranslationRequest;
                // try and filter first. This filter does not filter from all languages, but its a good start
                const parsedMessage = JSON.parse(body.text) as ParsedMessage;
                const filteredMessage = filter(parsedMessage.message ?? '');
                for (const lang of supportedLanguages) {
                    const translateReq = new TranslateTextCommand({
                        SourceLanguageCode: parsedMessage.sourceLanguage,
                        TargetLanguageCode: lang,
                        Text: filteredMessage,
                        Settings: {
                            Profanity: "MASK"
                        }
                    });
                    logger.info('translating', {
                        source: parsedMessage.sourceLanguage,
                        target: lang,
                    });
                    const translateResp = await this.translateClient.send(translateReq);
                    logger.info('translated response', {
                        metadata: translateResp.$metadata,
                        source: translateResp.SourceLanguageCode,
                        target: translateResp.TargetLanguageCode,
                        translatedText: translateResp.TranslatedText,
                    });
                    const topicName = this.generateTopicName(lang);
                    const messageToSend: MessageToPublish = {
                        timestamp: parsedMessage.timestamp,
                        message: translateResp.TranslatedText ?? '',
                        sourceLanguage: lang,
                        username: body.token_id,
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
                    await this.cacheClient.listPushFront(this.cache, lang, JSON.stringify(messageToSend), {
                        truncateBackToSize: 100,
                        ttl: CollectionTtl.refreshTtlIfProvided(fourHoursInSeconds)
                    });
                }

                return res.status(200).send({ message: 'success' });
            });
            api.get('latestMessages/:language', async (req: Request, res: Response) => {
                if (!(req.params && req.params.language)) {
                    return res.status(400).send({ message: 'missing required path param "language"'});
                };
                const listResp = await this.cacheClient.listFetch(this.cache, req.params.language);
                if (listResp instanceof CacheListFetch.Hit) {
                    const publishedMessages = listResp.valueListString().map(item => {
                        return JSON.parse(item) as MessageToPublish
                    });
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
                logger.info('received request to get supported languages', {
                    supportedLanguages
                });
                return res.status(200).send({ supportedLanguages });
            });
            api.get('token/:username', async (req: Request, res: Response) => {
                if (!(req.params && req.params.username)) {
                    return res.status(400).send({ message: 'missing required path param "username"'});
                }
                logger.info('received request to get token for chat', {
                    username: req.params.username
                });
                const subscribeOnlyScope = DisposableTokenScopes.topicPublishSubscribe(this.cache, AllTopics);
                const disposableTokenResp = await this.authClient.generateDisposableToken(subscribeOnlyScope, ExpiresIn.minutes(5), { tokenId: req.params.username });
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
                logger.error('unknown error occured when generating a disposable token', { resp: disposableTokenResp });
                return res.status(500).send({ message: 'unknown error occured when generating a disposable token' });
            })
        };
    }

    private generateTopicName = (lang: string): string => {
        return `${this.baseTopicName}-${lang}`;
    }
}
