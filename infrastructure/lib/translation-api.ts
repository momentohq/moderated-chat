import * as cdk from 'aws-cdk-lib';
import {Fn, RemovalPolicy} from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import {MethodLoggingLevel} from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {Effect, PolicyStatement} from "aws-cdk-lib/aws-iam";

export interface TranslationApiStackProps {
    isDevDeploy: boolean;
}

export class TranslationApiStack extends cdk.Stack {
    private readonly restApi: apigw.RestApi;
    constructor(
        scope: cdk.App,
        id: string,
        props: TranslationApiStackProps,
        cdkStackProps: cdk.StackProps
    ) {
        super(scope, id, cdkStackProps);

        const restApiName = 'translation';
        const logGroup = new logs.LogGroup(this, 'AccessLogs', {
            retention: 90, // Keep logs for 90 days
            logGroupName: Fn.sub(
                `${restApiName}-demo-gateway-logs-\${AWS::Region}`
            ),
            removalPolicy: props.isDevDeploy
                ? RemovalPolicy.DESTROY
                : RemovalPolicy.RETAIN,
        });
        const defaultRestApiProps: apigw.RestApiProps = {
            restApiName,
            endpointTypes: [apigw.EndpointType.REGIONAL],
            deploy: true,
            deployOptions: {
                stageName: 'prod',
                accessLogDestination: new apigw.LogGroupLogDestination(logGroup),
                accessLogFormat: apigw.AccessLogFormat.jsonWithStandardFields(),
                throttlingRateLimit: 10,
                throttlingBurstLimit: 25,
                metricsEnabled: true,
                loggingLevel: MethodLoggingLevel.INFO,
                description: 'translation endpoint for momento console',
            },
            defaultCorsPreflightOptions: {
                allowOrigins: apigw.Cors.ALL_ORIGINS,
                allowHeaders: apigw.Cors.DEFAULT_HEADERS,
                allowMethods: apigw.Cors.ALL_METHODS,
            },
        };

        this.restApi = new apigw.RestApi(this, 'rest-api', {
            ...defaultRestApiProps,
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

        this.addUnprotectedProxyEndpoint(v1TranslationApi, 'v1');
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
