import {API, Request, Response} from 'lambda-api';
import {IRoute} from '../../../common/routes/IRoute';
import logger from "../../../common/logger";
import {TranslateClient, TranslateTextCommand} from "@aws-sdk/client-translate";
import {supportedLanguages} from "../../../common/utils";
import {TopicClient, TopicPublish} from "@gomomento/sdk";
import { filter } from 'curse-filter';

type Props = {
    translateClient: TranslateClient;
    topicClient: TopicClient;
    cache: string;
    baseTopicName: string;
}

type TranslationRequest = {
    message: string;
    sourceLanguage: string;
}

export class TranslationRoute implements IRoute {
    private readonly translateClient: TranslateClient;
    private readonly topicClient: TopicClient;
    private readonly cache: string;
    private readonly baseTopicName: string;
    constructor(props: Props) {
        this.translateClient = props.translateClient;
        this.topicClient = props.topicClient;
        this.cache = props.cache;
        this.baseTopicName = props.baseTopicName;
    }
    routes(): (api: API) => void {
        return (api: API): void => {
            api.post('', async (req: Request, res: Response) => {
                logger.info('received translation request', {
                    body: req.body,
                })
                const body = req.body as TranslationRequest;
                // try and filter first. This filter does not filter from all languages, but its a good start
                const filteredMessage = filter(body.message ?? '');
                for (const lang of supportedLanguages) {
                    const translateReq = new TranslateTextCommand({
                        SourceLanguageCode: body.sourceLanguage,
                        TargetLanguageCode: lang,
                        Text: filteredMessage,
                        Settings: {
                            Profanity: "MASK"
                        }
                    });
                    logger.info('translating', {
                        source: body.sourceLanguage,
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
                    logger.info('publishing translated text to topic', {
                        topic: topicName
                    });
                    const publishResp = await this.topicClient.publish(this.cache, topicName, translateResp.TranslatedText ?? '');
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
                }

                return res.status(200).send({ message: 'success' });
            });
            api.get('languages', (req: Request, res: Response) => {
                logger.info('received request to get supported languages', {
                    supportedLanguages
                });
                return res.status(200).send({ supportedLanguages });
            })
        };
    }

    private generateTopicName = (lang: string): string => {
        return `${this.baseTopicName}-${lang}`;
    }
}
