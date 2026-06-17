import { Stack, StackProps, RemovalPolicy, CfnOutput, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwv2integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as amplify from "@aws-cdk/aws-amplify-alpha";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";

/**
 * Single-stack serverless infrastructure for ProcessCanvas.
 * Covers: Cognito, DynamoDB, Lambda, REST API GW, WebSocket API GW, S3, Amplify Hosting.
 */
export class ProcessCanvasStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
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
      removalPolicy: RemovalPolicy.DESTROY,
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
      removalPolicy: RemovalPolicy.DESTROY,
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
    const table = (name: string, pk: string, sk?: string) =>
      new dynamodb.Table(this, name, {
        partitionKey: { name: pk, type: dynamodb.AttributeType.STRING },
        ...(sk ? { sortKey: { name: sk, type: dynamodb.AttributeType.STRING } } : {}),
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
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
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const apiFn = new lambda.Function(this, "ApiFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "src.api.lambda_handler.handler",
      code: lambda.Code.fromAsset("../backend"),
      timeout: Duration.seconds(29),
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
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const wsFn = new lambda.Function(this, "WsFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "src.live_session.ws_handler.handler",
      code: lambda.Code.fromAsset("../backend"),
      timeout: Duration.seconds(29),
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
      autoBuild: true,  // deploy on every push to main
      stage: "PRODUCTION",
    });

    // -------------------------------------------------------------------------
    // Outputs
    // -------------------------------------------------------------------------
    new CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new CfnOutput(this, "RestApiUrl", { value: restApi.url });
    new CfnOutput(this, "WsApiUrl", { value: wsStage.url });
    new CfnOutput(this, "AssetBucketName", { value: assetBucket.bucketName });
    new CfnOutput(this, "AmplifyAppId", { value: amplifyApp.appId });
    new CfnOutput(this, "AmplifyDefaultDomain", { value: amplifyApp.defaultDomain });
    new CfnOutput(this, "AmplifyBranchUrl", {
      value: `https://${mainBranch.branchName}.${amplifyApp.defaultDomain}`,
    });
  }
}
