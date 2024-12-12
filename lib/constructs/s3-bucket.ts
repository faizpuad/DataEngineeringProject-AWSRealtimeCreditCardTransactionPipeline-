// Import necessary AWS CDK and related libraries
import { Construct } from 'constructs';
import { RemovalPolicy, Tags } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';

// Define the main class that encapsulates the S3 bucket setup
export class S3BucketConstruct extends Construct {
  public readonly mainBucket: s3.Bucket; // Main bucket for storage
  public readonly logBucket: s3.Bucket; // Log bucket for access logs

  // Constructor to initialize both S3 buckets with necessary properties
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create the logging bucket with specific configurations
    this.logBucket = new s3.Bucket(this, 'LogBucket', {
      bucketName: 'unique-log-bucket-name', // Unique name for the log bucket
      removalPolicy: RemovalPolicy.DESTROY, // Ensures the bucket is deleted with the stack
      autoDeleteObjects: true, // Automatically deletes objects when the bucket is removed
      encryption: s3.BucketEncryption.KMS_MANAGED, // Enable KMS-managed encryption for security
    });

    // Create the main storage bucket with logging enabled, pointing to the log bucket
    this.mainBucket = new s3.Bucket(this, 'MainBucket', {
      bucketName: 'unique-main-bucket-name', // Unique name for the main bucket
      removalPolicy: RemovalPolicy.DESTROY, // Ensure the bucket is deleted with the stack
      autoDeleteObjects: true, // Automatically deletes objects when the bucket is removed
      encryption: s3.BucketEncryption.KMS_MANAGED, // Enable KMS-managed encryption for security
      serverAccessLogsBucket: this.logBucket, // Link the log bucket for access logs
    });

    // Apply tags to both buckets for environment and project identification
    Tags.of(this.mainBucket).add('Environment', 'Development');
    Tags.of(this.mainBucket).add('Project', 'OLTP Pipeline');
    Tags.of(this.logBucket).add('Environment', 'Development');
    Tags.of(this.logBucket).add('Project', 'OLTP Logs');
  }

  // Getter method for retrieving the main bucket's name
  public get bucketName(): string {
    return this.mainBucket.bucketName;
  }
}