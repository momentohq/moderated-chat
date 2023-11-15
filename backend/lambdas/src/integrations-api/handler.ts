import {APIGatewayProxyEventV2, Context} from 'aws-lambda';
import createAPI, {API, NextFunction, Request, Response} from 'lambda-api';
import log, {initLogger} from '../common/logger';
import {TranslationRoute} from "./routes/v1/translation";

/******* Global scoped variables for reuse across lambda invocations *******/
let api: API;
/******* End Globally Scoped Variables *******/

export const createIntegrationsApi = (
): API => {
    const api = createAPI({
        logger: true,
    });

    api.use((req: Request, res: Response, next: NextFunction) => {
        res.cors({});
        next();
    });

    const errorHandler = (
        error: Error,
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        // send back cors even when there are errors
        res.cors({});
        next();
    };

    api.use(errorHandler);

    const translationRoute = new TranslationRoute();
    api.register(translationRoute.routes(), {
        prefix: '/v1/translation',
    });
    return api;
};



export const handler = async (
    event: APIGatewayProxyEventV2,
    context: Context
) => {
    initLogger({
        lambdaContext: context,
        additionalContext: {},
    });
    log.info('Beginning lambda execution');

    if (!api) {
        api = createIntegrationsApi();
    }
    return api.run(event, context)
};
