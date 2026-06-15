import { Stack, StackProps, RemovalPolicy, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";

/**
 * Single-stack serverless infrastructure for ProcessCanvas.
 * Frontend is hosted separately on AWS Amplify Hosting.
 */
export class ProcessCanvasStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // --- Cognito (Identity, U1) ---
    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: false }, // Q2=B: no email verification
      passwordPolicy: { minLength: 8, requireDigits: true, requireLowercase: true }, // Q3=A
      customAttributes: { role: new cognito.StringAttribute({ mutable: false }) },
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const userPoolClient = userPool.addClient("WebClient", {
      authFlows: { userPassword: true, userSrp: true },
    });

    // --- DynamoDB tables (on-demand) ---
    const table = (name: string, pk: string, sk?: string) =>
      new dynamodb.Table(this, name, {
        tableName: name,
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
    const joinCodes = table("JoinCodes", "code");
    const configurations = table("Configurations", "configId");
    const versions = table("ConfigurationVersions", "configId", "versionNumber");
    const templates = table("Templates", "templateId");
    const exercises = table("Exercises", "exerciseId");
    const studentState = table("StudentExerciseState", "exerciseId", "studentId");
    const attempts = table("Attempts", "studentId", "attemptId");
    attempts.addGlobalSecondaryIndex({
      indexName: "byExercise",
      partitionKey: { name: "exerciseId", type: dynamodb.AttributeType.STRING },
    });
    const sessions = table("Sessions", "sessionId");
    const participants = table("SessionParticipants", "sessionId", "studentId");
    const connections = table("WsConnections", "sessionId", "connectionId");

    const allTables = [
      users, enrollments, joinCodes, configurations, versions, templates,
      exercises, studentState, attempts, sessions, participants, connections,
    ];

    // --- API Lambda (Python; single handler routing to modules) ---
    const apiFn = new lambda.Function(this, "ApiFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "src.api.lambda_handler.handler",
      code: lambda.Code.fromAsset("../backend"),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        ...Object.fromEntries(allTables.map((t) => [`TABLE_${t.node.id.toUpperCase()}`, t.tableName])),
      },
    });
    // Least-privilege: grant only needed access per table (broadly granted here for skeleton).
    allTables.forEach((t) => t.grantReadWriteData(apiFn));

    // Cognito admin actions for registration/login (scoped to this user pool).
    apiFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminSetUserPassword",
        "cognito-idp:AdminGetUser",
        "cognito-idp:InitiateAuth",
      ],
      resources: [userPool.userPoolArn],
    }));

    // --- REST API: public /auth/* + protected proxy with Cognito authorizer ---
    const authorizer = new apigw.CognitoUserPoolsAuthorizer(this, "Authorizer", {
      cognitoUserPools: [userPool],
    });
    const api = new apigw.RestApi(this, "RestApi", {
      restApiName: "ProcessCanvas",
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });
    const integration = new apigw.LambdaIntegration(apiFn);

    // Public auth routes (no authorizer): POST /auth/register, POST /auth/login
    const auth = api.root.addResource("auth");
    auth.addResource("register").addMethod("POST", integration);
    auth.addResource("login").addMethod("POST", integration);

    // Protected catch-all for everything else
    const proxy = api.root.addResource("{proxy+}");
    proxy.addMethod("ANY", integration, {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });

    new CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new CfnOutput(this, "RestApiUrl", { value: api.url });
  }
}
