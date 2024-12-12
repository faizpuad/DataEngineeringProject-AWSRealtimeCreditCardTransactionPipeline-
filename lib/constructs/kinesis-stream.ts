import { Construct } from 'constructs';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import { RemovalPolicy } from 'aws-cdk-lib'; 

export class StreamConstruct extends Construct {
  public readonly stream: kinesis.Stream;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Set up logging for stream activities
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      retention: logs.RetentionDays.ONE_WEEK, // Retain logs for a specified period
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create an encryption key for securing stream data
    const kmsKey = new kms.Key(this, 'EncryptionKey', {
      enableKeyRotation: true,  // Enable key rotation
      removalPolicy: RemovalPolicy.DESTROY, // Handle key removal policy
    });

    // Create and configure a stream
    this.stream = new kinesis.Stream(this, 'Stream', {
      shardCount: 1, // Define number of shards
      encryption: kinesis.StreamEncryption.KMS,  // Enable encryption
      encryptionKey: kmsKey,  // Assign encryption key
    });

    // Apply generic tags for organizational purposes (optional)
    // You may choose to add any other relevant tags or attributes for your context
  }

  public get streamName(): string {
    return this.stream.streamName;
  }
}