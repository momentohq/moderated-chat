import {API, Request, Response} from 'lambda-api';
import {IRoute} from '../../../common/routes/IRoute';
import logger from "../../../common/logger";

type TranslationRequest = {
    message: string;
    targetLanguage: string;
}
export class TranslationRoute implements IRoute {
    routes(): (api: API) => void {
        return (api: API): void => {
            api.post('', (req: Request, res: Response) => {
                logger.info(`Request`, req);
                const body = req.body as TranslationRequest;
                logger.info(`Body`, body);
                return res.status(200).send(body);
            });
        };
    }
}
