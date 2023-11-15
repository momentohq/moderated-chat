import * as cdk from 'aws-cdk-lib';
import {Fn, RemovalPolicy} from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import {MethodLoggingLevel} from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface UserManagementApiStackProps {
    momentoSsoOrgName: "preprod";
    isDevDeploy: boolean;
}

export class TranslationApiStack extends cdk.Stack {
    private readonly restApi: cdk.aws_apigateway.RestApi;
    constructor(
        scope: cdk.App,
        id: string,
        props: UserManagementApiStackProps,
        cdkStackProps: cdk.StackProps
    ) {
        super(scope, id, cdkStackProps);

        const restApiName = 'translation';
        const logGroup = new logs.LogGroup(this, 'AccessLogs', {
            retention: 90, // Keep logs for 90 days
            logGroupName: Fn.sub(
                `${restApiName}-${props.momentoSsoOrgName.toLowerCase()}-gateway-logs-\${AWS::Region}`
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

        const momentoAuthToken = "your-momento-auth-token-goes-here"

        const v1TranslationApi = new lambda.Function(this, 'translation-lambda-function', {
            functionName: 'translation',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'handler.handler',
            memorySize: 512,
            environment: {
                MOMENTO_AUTH_TOKEN: momentoAuthToken,
            },
            code: lambda.Code.fromAsset(
                path.join('..', 'backend', 'lambdas', 'dist', 'integrations-api', 'integrations-api.zip')
            ),
        });

        this.addUnprotectedProxyEndpoint(v1TranslationApi, 'v1');
    }

    private addUnprotectedProxyEndpoint(
        lambda: cdk.aws_lambda.IFunction,
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
