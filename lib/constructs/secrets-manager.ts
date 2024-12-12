// Import necessary AWS CDK and Secrets Manager libraries
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

// Define properties needed for the Secrets Manager construct
interface SecretsManagerConstructProps extends cdk.StackProps {
  authToken: string;  // Authorization token
  dbUsername: string; // Database username
  dbPassword: string; // Database password
  dbName: string;     // Database name
  dbEndpoint: string; // Database endpoint
  bucketName: string; // S3 bucket name for storage
}

// Main class to handle Secrets Manager setup
export class SecretsManagerConstruct extends Construct {
  public readonly secret: secretsmanager.Secret; // The secret stored in Secrets Manager

  // Constructor to create and configure the secret
  constructor(scope: Construct, id: string, props: SecretsManagerConstructProps) {
    super(scope, id);

    // Validate required properties before proceeding
    this.validateProps(props);

    // Create a secret with the necessary information
    this.secret = new secretsmanager.Secret(this, 'AppSecrets', {
      secretName: 'unique-secrets-name', // The name of the secret in Secrets Manager
      secretObjectValue: {
        AUTHORIZER_TOKEN: cdk.SecretValue.unsafePlainText(props.authToken),
        DB_USERNAME: cdk.SecretValue.unsafePlainText(props.dbUsername),
        DB_PASSWORD: cdk.SecretValue.unsafePlainText(props.dbPassword),
        DB_NAME: cdk.SecretValue.unsafePlainText(props.dbName),
        DB_ENDPOINT: cdk.SecretValue.unsafePlainText(props.dbEndpoint),
        BUCKET_NAME: cdk.SecretValue.unsafePlainText(props.bucketName)
      }
    });
  }

  // Validate the required input properties
  private validateProps(props: SecretsManagerConstructProps): void {
    // List of properties that must be provided
    const requiredProps: (keyof SecretsManagerConstructProps)[] = [
      'authToken', 
      'dbUsername', 
      'dbPassword', 
      'dbName', 
      'dbEndpoint', 
      'bucketName'
    ];

    // Check if each required property is present and valid
    requiredProps.forEach(prop => {
      if (!props[prop]) {
        throw new Error(`Missing required property: ${prop}`);
      }
    });

    // Perform additional validation on the auth token (example: length check)
    if (props.authToken.length < 10) {
      throw new Error('Authorization token is too short');
    }
  }

  // Method to retrieve the secret value from Secrets Manager
  public getSecretValue(): cdk.SecretValue {
    return this.secret.secretValue;
  }
}