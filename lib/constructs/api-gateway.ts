import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';

interface ApiGatewayConstructProps {
  lambdaFunction: lambda.IFunction;
  authorizerFunction: lambda.IFunction;
}

export class ApiGatewayConstruct extends Construct {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
    super(scope, id);

    // Set up logging for API Gateway access
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
      logGroupName: '/aws/apigateway/access-logs',
    });

    // Configure API Gateway
    this.api = new apigateway.RestApi(this, 'ApiGateway', {
      restApiName: 'API Gateway',
      description: 'API Gateway with token-based authentication',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Set up Lambda authorizer
    const authorizer = new apigateway.TokenAuthorizer(this, 'TokenAuthorizer', {
      handler: props.authorizerFunction,
      identitySource: apigateway.IdentitySource.header('Authorization'),
      resultsCacheTtl: cdk.Duration.minutes(5), // Cache auth results
    });

    // Add resource to the API
    const resource = this.api.root.addResource('resource');

    // Integrate Lambda function with the API
    const lambdaIntegration = new apigateway.LambdaIntegration(props.lambdaFunction);

    // Add methods (GET, POST) with authorization
    ['GET', 'POST'].forEach(method => {
      resource.addMethod(method, lambdaIntegration, {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.CUSTOM,
      });
    });
  }
}