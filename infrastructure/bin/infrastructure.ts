import * as cdk from 'aws-cdk-lib';
import {GetCallerIdentityCommand, STSClient} from '@aws-sdk/client-sts';
import {TranslationApiStack} from "../lib/translation-api";

async function main() {
    const stsClient = new STSClient({});
    const command = new GetCallerIdentityCommand({});
    let stsResponse;
    try {
        stsResponse = await stsClient.send(command);
    } catch (e) {
        throw new Error(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Unable to load AWS account info; make sure you have set AWS_PROFILE or otherwise provided the appropriate credentials for the target cell account. ${e}`
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const callerAccountId = stsResponse.Account!;
    const region = process.env.AWS_REGION;
    if (!region) {
        throw new Error('Missing required env var AWS_REGION');
    }

    const stackEnv = {
        account: callerAccountId,
        region: region,
    };

    const app = new cdk.App();

    new TranslationApiStack(
        app,
        `translation-api-stack-preprod`,
        {
            isDevDeploy: Boolean(process.env.IS_DEV_DEPLOY),
        },
        {env: stackEnv}
    );
}

main().catch(e => {
    throw e;
});
