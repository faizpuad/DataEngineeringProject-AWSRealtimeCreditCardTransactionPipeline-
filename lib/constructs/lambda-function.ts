import { Construct } from 'constructs';
import { Tags } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';  
import { RemovalPolicy } from 'aws-cdk-lib';  
import * as logs from 'aws-cdk-lib/aws-logs';  

// Interface to define the basic parameters for a Lambda function
interface LambdaFunctionProps {
  functionName: string; // The name of the Lambda function
  handler: string; // The entry point for the Lambda function
  role?: iam.IRole; // Optional IAM role for Lambda execution
  environment?: { [key: string]: string }; // Optional environment variables for Lambda
  kmsKey?: kms.IKey; // Optional KMS key for encrypting sensitive data
}

export class LambdaFunctionConstruct extends Construct {
  public readonly lambdaFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaFunctionProps) {
    super(scope, id);

    // Step 1: Create a log group for monitoring Lambda execution
    // Logs help track the function's performance and errors. Set retention policy.
    const logGroup = new logs.LogGroup(this, `${props.functionName}LogGroup`, {
      retention: logs.RetentionDays.ONE_DAY,  // Adjust retention based on needs
      removalPolicy: RemovalPolicy.DESTROY,  // Set removal policy, be careful in production
      logGroupName: `/aws/lambda/${props.functionName}`, // Optional: Define a custom log group name
    });

    // Step 2: Add tags to the log group for easier categorization
    // Tagging helps to organize and identify resources in your AWS environment
    Tags.of(logGroup).add('Environment', 'Development');
    Tags.of(logGroup).add('Project', 'Example Project');

    // Step 3: Optional: Create or use an existing KMS key for encrypting Lambda's environment variables
    // The key enables secure management of sensitive environment variables
    const kmsKey = props.kmsKey ?? new kms.Key(this, 'LambdaEncryptionKey', {
      enableKeyRotation: true,  // Enable automatic key rotation for enhanced security
      removalPolicy: RemovalPolicy.DESTROY,  // Be cautious in production environments
    });

    // Step 4: Define the Lambda function using the provided properties
    // Lambda function is created with the specified runtime, code source, handler, and environment
    this.lambdaFunction = new lambda.Function(this, 'LambdaFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,  // Define runtime, adjust as needed
      code: lambda.Code.fromAsset('lib/lambda'),  // Specify the location of your Lambda code
      handler: props.handler, // The function handler to invoke
      functionName: props.functionName, // Lambda function name
      role: props.role, // Optional IAM role
      environment: props.environment,  // Set environment variables, if provided
      environmentEncryption: kmsKey, // Encrypt environment variables if a KMS key is provided
      logGroup: logGroup,  // Attach the log group to the Lambda function for logging
    });

    // Step 5: Optionally, grant the Lambda function permissions to use the KMS key
    kmsKey.grantEncryptDecrypt(this.lambdaFunction);  // Allow Lambda to access the KMS key

    // Step 6: Add tags to the Lambda function for easy identification
    // Tags help categorize and manage resources
    Tags.of(this.lambdaFunction).add('Environment', 'Development');
    Tags.of(this.lambdaFunction).add('Project', 'Example Project');
  }
}