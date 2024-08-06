import * as cdk from 'aws-cdk-lib';
import {Fn, RemovalPolicy, CustomResource} from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import {MethodLoggingLevel} from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {Effect, PolicyStatement} from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as certmgr from "aws-cdk-lib/aws-certificatemanager";
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';

export interface TranslationApiStackProps {
    isDevDeploy: boolean;
    apiDomain: string;
    apiSubdomain: string;
}

export class TranslationApiStack extends cdk.Stack {
    readonly restApi: apigw.RestApi;
    constructor(
        scope: cdk.App,
        id: string,
        props: TranslationApiStackProps,
        cdkStackProps: cdk.StackProps
    ) {
        super(scope, id, cdkStackProps);

        const restApiName = 'translation';

        // Commented out these logs for now as they required some sort of 
        // manual configuration in the console I couldn't figure out.
        // const logGroup = new logs.LogGroup(this, 'AccessLogs', {
        //     retention: 90, // Keep logs for 90 days
        //     logGroupName: Fn.sub(
        //         `${restApiName}-demo-gateway-logs-\${AWS::Region}`
        //     ),
        //     removalPolicy: props.isDevDeploy
        //         ? RemovalPolicy.DESTROY
        //         : RemovalPolicy.RETAIN,
        // });

        // Register the subdomain and create a certificate for it
        const hostedZone = route53.HostedZone.fromLookup(
            this,
            'chat-api-hosted-zone',
            {
                domainName: props.apiDomain,
            }
        );
        const certificate = new certmgr.Certificate(this, 'chat-api-cert', {
            domainName: `${props.apiSubdomain}.${props.apiDomain}`,
            validation: certmgr.CertificateValidation.fromDns(hostedZone),
        });
        const defaultRestApiProps: apigw.RestApiProps = {
            restApiName,
            endpointTypes: [apigw.EndpointType.REGIONAL],
            deploy: true,
            description: "Rest api that contains the backend code/logic for the moderated chat demo",
            deployOptions: {
                stageName: 'prod',
                // accessLogDestination: new apigw.LogGroupLogDestination(logGroup),
                // accessLogFormat: apigw.AccessLogFormat.jsonWithStandardFields(),
                throttlingRateLimit: 10,
                throttlingBurstLimit: 25,
                metricsEnabled: true,
                // loggingLevel: MethodLoggingLevel.INFO,
                description: 'translation endpoint for momento console',
            },
            defaultCorsPreflightOptions: {
                allowOrigins: apigw.Cors.ALL_ORIGINS,
                allowHeaders: apigw.Cors.DEFAULT_HEADERS,
                allowMethods: apigw.Cors.ALL_METHODS,
            },
            domainName: {
                domainName: `${props.apiSubdomain}.${props.apiDomain}`,
                endpointType: apigw.EndpointType.REGIONAL,
                certificate,
            }
        };

        this.restApi = new apigw.RestApi(this, 'rest-api', {
            ...defaultRestApiProps,
        });

        new route53.ARecord(this, "rest-api-dns", {
            zone: hostedZone,
            recordName: props.apiSubdomain,
            comment: "This is the A Record used for the moderated chat api backend",
            target: route53.RecordTarget.fromAlias(
                new route53Targets.ApiGateway(this.restApi)
            ),
        });

        const secretsPath = 'moderator/demo/secrets';
        const v1TranslationApi = new lambda.Function(this, 'translation-lambda-function', {
            functionName: `${restApiName}-api`,
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'handler.handler',
            memorySize: 512,
            environment: {
                SECRETS_PATH: secretsPath,
                MOMENTO_CACHE_NAME: 'moderator',
            },
            code: lambda.Code.fromAsset(
                path.join('..', 'backend', 'lambdas', 'dist', 'translations-api', 'translations-api.zip')
            ),
        });
        // provide access to our lambda to translate text
        v1TranslationApi.addToRolePolicy(new PolicyStatement({
            resources: ['*'],
            actions: ['translate:TranslateText', 'comprehend:DetectDominantLanguage', 'rekognition:DetectModerationLabels'],
            effect: Effect.ALLOW
        }));
        const translationSecrets = secrets.Secret.fromSecretNameV2(
            this,
            'translation-secrets',
            secretsPath
        );
        translationSecrets.grantRead(v1TranslationApi);
        translationSecrets.grantWrite(v1TranslationApi);

        this.addUnprotectedProxyEndpoint(v1TranslationApi, 'v1');

        // This lambda creates the required cache and webhook if it doesn't already exist.
        // Runs only when doing a cdk deploy
        const setupLambda = new lambda.Function(this, 'translation-resources-setup', {
            functionName: `${restApiName}-api-resources-setup`,
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'handler.handler',
            memorySize: 512,
            environment: {
                SECRETS_PATH: secretsPath,
                MOMENTO_CACHE_NAME: 'moderator',
            },
            code: lambda.Code.fromAsset(
                path.join('..', 'backend', 'setup-lambda', 'dist', 'setup', 'setup.zip')
            ),
        });
        translationSecrets.grantRead(setupLambda);
        translationSecrets.grantWrite(setupLambda);

        // This lambda is supposed to return a boolean indicating if the setup is complete.
        // Was unable to get it to work in order to implement the CloudFormation timeout.
        // CustomResource ServiceTimeout option is not yet implemented in aws-cdk-lib.

        // const isCompleteLambda = new lambda.Function(this, 'translation-resources-setup-is-complete', {
        //     functionName: `${restApiName}-api-resources-setup-is-complete`,
        //     runtime: lambda.Runtime.NODEJS_20_X,
        //     handler: 'handler.isComplete',
        //     memorySize: 512,
        //     environment: {
        //         SECRETS_PATH: secretsPath,
        //         MOMENTO_CACHE_NAME: 'moderator',
        //     },
        //     code: lambda.Code.fromAsset(
        //         path.join('..', 'backend', 'setup-lambda', 'dist', 'setup', 'setup.zip')
        //     ),
        // });
        // translationSecrets.grantRead(isCompleteLambda);

        const provider = new cdk.custom_resources.Provider(this, 'translation-resources-provider', {
            onEventHandler: setupLambda,
            // totalTimeout: cdk.Duration.minutes(20),
            // isCompleteHandler: isCompleteLambda,
        });
        new cdk.CustomResource(this, 'translations-api-resources-custom-provider', {
            serviceToken: provider.serviceToken,
            properties: {
                apiGatewayUrl: this.restApi.url,
            },
        });
    }

    private addUnprotectedProxyEndpoint(
        lambda: lambda.IFunction,
        resource: string,
        baseResource?: apigw.Resource
    ) {
        const apiResource = baseResource
            ? baseResource.addResource(resource)
            : this.restApi.root.addResource(resource);

        apiResource.addProxy({
            defaultIntegration: new apigw.LambdaIntegration(lambda, {}),
            anyMethod: true,
        });
    }
}
