import * as log from 'lambda-log';
import {Context} from 'aws-lambda';

interface Props {
    lambdaContext: Context;
    additionalContext: {[key: string]: unknown};
}

const logger = log;

export const initLogger = (props: Props): void => {
    logger.options.dynamicMeta = () => {
        const dynamicMetadata: {[key: string]: unknown} = {
            functionName: props.lambdaContext.functionName,
            invokedFunctionArn: props.lambdaContext.invokedFunctionArn,
            functionVersion: props.lambdaContext.functionVersion,
            memoryLimitInMB: props.lambdaContext.memoryLimitInMB,
            remainingTimeInMillis: props.lambdaContext.getRemainingTimeInMillis(),
        };

        for (const [key, value] of Object.entries(props.additionalContext)) {
            dynamicMetadata[key] = value;
        }

        return dynamicMetadata;
    };
};

export default logger;
