import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';

export class GeneralPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Validate required environment variables
    const mandatoryEnvVars = ['ENV_VAR_1', 'ENV_VAR_2'];
    mandatoryEnvVars.forEach((key) => {
      if (!process.env[key]) {
        throw new Error(`${key} environment variable must be defined.`);
      }
    });

    // Apply global tags
    cdk.Tags.of(this).add('Environment', 'Development');
    cdk.Tags.of(this).add('Project', 'GeneralPipeline');

    // Step 1: Create an S3 bucket
    const dataBucket = new s3.Bucket(this, 'DataBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Step 2: Create a Lambda function
    const processingLambda = new lambda.Function(this, 'ProcessingLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'index.handler',
      environment: {
        BUCKET_NAME: dataBucket.bucketName,
      },
    });

    // Grant permissions for the Lambda to access the S3 bucket
    dataBucket.grantReadWrite(processingLambda);

    // Step 3: Add S3 event notification to trigger Lambda on object creation
    dataBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(processingLambda),
      { prefix: 'input-data/' } // Optional: Trigger only for specific key prefixes
    );

    // Step 4: Create a Kinesis data stream (abstracted for general use)
    const dataStream = new cdk.aws_kinesis.Stream(this, 'DataStream', {
      shardCount: 1,
    });

    // Step 5: Add a Kinesis event source to the Lambda function
    processingLambda.addEventSource(
      new lambdaEventSources.KinesisEventSource(dataStream, {
        batchSize: 5,
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      })
    );

    // Step 6: Output key resources for debugging
    new cdk.CfnOutput(this, 'BucketName', {
      value: dataBucket.bucketName,
      description: 'The name of the S3 bucket',
    });

    new cdk.CfnOutput(this, 'StreamName', {
      value: dataStream.streamName,
      description: 'The name of the Kinesis data stream',
    });
  }
}
