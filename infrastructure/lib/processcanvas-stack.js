"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessCanvasStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigw = __importStar(require("aws-cdk-lib/aws-apigateway"));
const apigwv2 = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const apigwv2integrations = __importStar(require("aws-cdk-lib/aws-apigatewayv2-integrations"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const amplify = __importStar(require("@aws-cdk/aws-amplify-alpha"));
const codebuild = __importStar(require("aws-cdk-lib/aws-codebuild"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
/**
 * Single-stack serverless infrastructure for ProcessCanvas.
 * Covers: Cognito, DynamoDB, Lambda, REST API GW, WebSocket API GW, S3, Amplify Hosting.
 */
class ProcessCanvasStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // -------------------------------------------------------------------------
        // Cognito (Identity, U1)
        // -------------------------------------------------------------------------
        const userPool = new cognito.UserPool(this, "UserPool", {
            selfSignUpEnabled: true,
            signInAliases: { email: true },
            autoVerify: { email: false }, // Q2=B: no email verification required
            passwordPolicy: { minLength: 8, requireDigits: true, requireLowercase: true },
            customAttributes: { role: new cognito.StringAttribute({ mutable: false }) },
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        const userPoolClient = userPool.addClient("WebClient", {
            authFlows: { userPassword: true, userSrp: true },
        });
        userPool.addGroup("Instructors", { groupName: "Instructors" });
        userPool.addGroup("Students", { groupName: "Students" });
        // -------------------------------------------------------------------------
        // S3 — asset / upload bucket
        // -------------------------------------------------------------------------
        const assetBucket = new s3.Bucket(this, "AssetBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: false,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
                    allowedOrigins: ["*"],
                    allowedHeaders: ["*"],
                    maxAge: 3000,
                },
            ],
        });
        // -------------------------------------------------------------------------
        // DynamoDB tables (on-demand)
        // -------------------------------------------------------------------------
        const table = (name, pk, sk) => new dynamodb.Table(this, name, {
            partitionKey: { name: pk, type: dynamodb.AttributeType.STRING },
            ...(sk ? { sortKey: { name: sk, type: dynamodb.AttributeType.STRING } } : {}),
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        const users = table("Users", "userId");
        users.addGlobalSecondaryIndex({
            indexName: "byEmail",
            partitionKey: { name: "email", type: dynamodb.AttributeType.STRING },
        });
        const enrollments = table("Enrollments", "instructorId", "studentId");
        enrollments.addGlobalSecondaryIndex({
            indexName: "byStudent",
            partitionKey: { name: "studentId", type: dynamodb.AttributeType.STRING },
        });
        const joinCodes = table("JoinCodes", "code");
        const configurations = table("Configurations", "configId");
        configurations.addGlobalSecondaryIndex({
            indexName: "byOwner",
            partitionKey: { name: "ownerInstructorId", type: dynamodb.AttributeType.STRING },
        });
        const versions = table("ConfigurationVersions", "configId", "versionNumber");
        const templates = table("Templates", "templateId");
        templates.addGlobalSecondaryIndex({
            indexName: "byOwner",
            partitionKey: { name: "ownerInstructorId", type: dynamodb.AttributeType.STRING },
        });
        const exercises = table("Exercises", "exerciseId");
        const studentState = table("StudentExerciseState", "exerciseId", "studentId");
        const attempts = table("Attempts", "studentId", "attemptId");
        attempts.addGlobalSecondaryIndex({
            indexName: "byExercise",
            partitionKey: { name: "exerciseId", type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        const sessions = table("Sessions", "sessionId");
        const participants = table("SessionParticipants", "sessionId", "studentId");
        const connections = table("WsConnections", "sessionId", "connectionId");
        connections.addGlobalSecondaryIndex({
            indexName: "byConnection",
            partitionKey: { name: "connectionId", type: dynamodb.AttributeType.STRING },
        });
        const allTables = [
            users, enrollments, joinCodes, configurations, versions, templates,
            exercises, studentState, attempts, sessions, participants, connections,
        ];
        // -------------------------------------------------------------------------
        // Lambda — REST API handler
        // -------------------------------------------------------------------------
        const apiLogGroup = new logs.LogGroup(this, "ApiFnLogs", {
            logGroupName: "/processcanvas/lambda/api",
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        const apiFn = new lambda.Function(this, "ApiFn", {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: "src.api.lambda_handler.handler",
            code: lambda.Code.fromAsset("../backend"),
            timeout: aws_cdk_lib_1.Duration.seconds(29),
            logGroup: apiLogGroup,
            environment: {
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
                ASSET_BUCKET: assetBucket.bucketName,
                ...Object.fromEntries(allTables.map((t) => [`TABLE_${t.node.id.toUpperCase()}`, t.tableName])),
            },
        });
        allTables.forEach((t) => t.grantReadWriteData(apiFn));
        assetBucket.grantReadWrite(apiFn);
        apiFn.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                "cognito-idp:AdminCreateUser",
                "cognito-idp:AdminSetUserPassword",
                "cognito-idp:AdminGetUser",
                "cognito-idp:AdminAddUserToGroup",
                "cognito-idp:InitiateAuth",
            ],
            resources: [userPool.userPoolArn],
        }));
        // -------------------------------------------------------------------------
        // Lambda — WebSocket handlers
        // -------------------------------------------------------------------------
        const wsLogGroup = new logs.LogGroup(this, "WsFnLogs", {
            logGroupName: "/processcanvas/lambda/websocket",
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        const wsFn = new lambda.Function(this, "WsFn", {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: "src.live_session.ws_handler.handler",
            code: lambda.Code.fromAsset("../backend"),
            timeout: aws_cdk_lib_1.Duration.seconds(29),
            logGroup: wsLogGroup,
            environment: {
                ...Object.fromEntries(allTables.map((t) => [`TABLE_${t.node.id.toUpperCase()}`, t.tableName])),
            },
        });
        [sessions, participants, connections].forEach((t) => t.grantReadWriteData(wsFn));
        // -------------------------------------------------------------------------
        // REST API Gateway + Cognito authorizer
        // -------------------------------------------------------------------------
        const authorizer = new apigw.CognitoUserPoolsAuthorizer(this, "Authorizer", {
            cognitoUserPools: [userPool],
        });
        const restApi = new apigw.RestApi(this, "RestApi", {
            restApiName: "ProcessCanvas",
            deployOptions: {
                loggingLevel: apigw.MethodLoggingLevel.INFO,
                dataTraceEnabled: false,
            },
            defaultCorsPreflightOptions: {
                allowOrigins: apigw.Cors.ALL_ORIGINS,
                allowMethods: apigw.Cors.ALL_METHODS,
                allowHeaders: ["Content-Type", "Authorization"],
            },
        });
        const integration = new apigw.LambdaIntegration(apiFn);
        // Public: POST /auth/register, POST /auth/login
        const authResource = restApi.root.addResource("auth");
        authResource.addResource("register").addMethod("POST", integration);
        authResource.addResource("login").addMethod("POST", integration);
        // Protected catch-all
        restApi.root.addResource("{proxy+}").addMethod("ANY", integration, {
            authorizer,
            authorizationType: apigw.AuthorizationType.COGNITO,
        });
        // Inject CORS headers on authorizer rejections so the browser sees a proper
        // auth error instead of a misleading CORS error.
        const corsHeaders = {
            "Access-Control-Allow-Origin": "'*'",
            "Access-Control-Allow-Headers": "'Content-Type,Authorization'",
        };
        new apigw.GatewayResponse(this, "GwRespUnauthorized", {
            restApi,
            type: apigw.ResponseType.UNAUTHORIZED,
            statusCode: "401",
            responseHeaders: corsHeaders,
        });
        new apigw.GatewayResponse(this, "GwRespAccessDenied", {
            restApi,
            type: apigw.ResponseType.ACCESS_DENIED,
            statusCode: "403",
            responseHeaders: corsHeaders,
        });
        new apigw.GatewayResponse(this, "GwRespDefault4xx", {
            restApi,
            type: apigw.ResponseType.DEFAULT_4XX,
            responseHeaders: corsHeaders,
        });
        new apigw.GatewayResponse(this, "GwRespDefault5xx", {
            restApi,
            type: apigw.ResponseType.DEFAULT_5XX,
            responseHeaders: corsHeaders,
        });
        // -------------------------------------------------------------------------
        // WebSocket API Gateway (live session)
        // -------------------------------------------------------------------------
        const wsIntegration = new apigwv2integrations.WebSocketLambdaIntegration("WsIntegration", wsFn);
        const wsApi = new apigwv2.WebSocketApi(this, "WsApi", {
            connectRouteOptions: { integration: wsIntegration },
            disconnectRouteOptions: { integration: wsIntegration },
            defaultRouteOptions: { integration: wsIntegration },
        });
        const wsStage = new apigwv2.WebSocketStage(this, "WsStage", {
            webSocketApi: wsApi,
            stageName: "prod",
            autoDeploy: true,
        });
        // Allow WebSocket Lambda to manage connections (post back to clients)
        wsFn.addToRolePolicy(new iam.PolicyStatement({
            actions: ["execute-api:ManageConnections"],
            resources: [
                `arn:aws:execute-api:${this.region}:${this.account}:${wsApi.apiId}/prod/POST/@connections/*`,
            ],
        }));
        wsFn.addEnvironment("WS_ENDPOINT", wsStage.callbackUrl);
        // -------------------------------------------------------------------------
        // Amplify Hosting — Next.js static frontend
        // Deploys automatically on push to main via GitHub source connection.
        // -------------------------------------------------------------------------
        const amplifyRole = new iam.Role(this, "AmplifyRole", {
            assumedBy: new iam.ServicePrincipal("amplify.amazonaws.com"),
        });
        const amplifyApp = new amplify.App(this, "FrontendApp", {
            appName: "ProcessCanvas",
            role: amplifyRole,
            buildSpec: codebuild.BuildSpec.fromObjectToYaml({
                version: 1,
                frontend: {
                    phases: {
                        preBuild: { commands: ["cd frontend", "npm ci"] },
                        build: { commands: ["npm run build"] },
                    },
                    artifacts: { baseDirectory: "frontend/out", files: ["**/*"] },
                    cache: { paths: ["frontend/node_modules/**/*"] },
                },
            }),
            environmentVariables: {
                NEXT_PUBLIC_API_URL: restApi.url,
                NEXT_PUBLIC_WS_URL: wsStage.url,
                NEXT_PUBLIC_USER_POOL_ID: userPool.userPoolId,
                NEXT_PUBLIC_USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
                NEXT_PUBLIC_REGION: this.region,
            },
        });
        const mainBranch = amplifyApp.addBranch("main", {
            autoBuild: true, // deploy on every push to main
            stage: "PRODUCTION",
        });
        // -------------------------------------------------------------------------
        // Outputs
        // -------------------------------------------------------------------------
        new aws_cdk_lib_1.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
        new aws_cdk_lib_1.CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
        new aws_cdk_lib_1.CfnOutput(this, "RestApiUrl", { value: restApi.url });
        new aws_cdk_lib_1.CfnOutput(this, "WsApiUrl", { value: wsStage.url });
        new aws_cdk_lib_1.CfnOutput(this, "AssetBucketName", { value: assetBucket.bucketName });
        new aws_cdk_lib_1.CfnOutput(this, "AmplifyAppId", { value: amplifyApp.appId });
        new aws_cdk_lib_1.CfnOutput(this, "AmplifyDefaultDomain", { value: amplifyApp.defaultDomain });
        new aws_cdk_lib_1.CfnOutput(this, "AmplifyBranchUrl", {
            value: `https://${mainBranch.branchName}.${amplifyApp.defaultDomain}`,
        });
    }
}
exports.ProcessCanvasStack = ProcessCanvasStack;
