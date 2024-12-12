import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Tags } from 'aws-cdk-lib';

interface ContainerLambdaProps {
  bucketName: string;
  secretArn: string;
  lambdaRole?: iam.Role;
  ecrRepositoryName: string;
}

export class ContainerLambdaConstruct extends Construct {
  public readonly lambdaFunction: lambda.DockerImageFunction;
  public readonly lambdaRole: iam.Role;
  public readonly ecrRepo: ecr.IRepository;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: ContainerLambdaProps) {
    super(scope, id);

    // Create or use an existing Lambda execution role
    this.lambdaRole = props.lambdaRole || this.createLambdaRole(props.bucketName, props.secretArn);

    // Construct the ECR repository ARN dynamically
    const repositoryArn = `arn:aws:ecr:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:repository/${props.ecrRepositoryName}`;

    // Import the existing ECR repository
    this.ecrRepo = ecr.Repository.fromRepositoryAttributes(this, 'DockerImageRepository', {
      repositoryArn: repositoryArn,
      repositoryName: props.ecrRepositoryName
    });

    // Create CloudWatch Log Group
    this.logGroup = new logs.LogGroup(this, 'LambdaLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Define image tag (fallback to 'latest' if not provided)
    const imageTag = process.env.IMAGE_TAG || 'latest';

    // Define Lambda function using Docker image from ECR
    this.lambdaFunction = new lambda.DockerImageFunction(this, 'ContainerLambda', {
      functionName: 'LambdaContainerHandler',
      code: lambda.DockerImageCode.fromEcr(this.ecrRepo, { tagOrDigest: imageTag }),
      role: this.lambdaRole,
      environment: {
        BUCKET_NAME: props.bucketName,
        SECRET_ARN: props.secretArn,
        ENVIRONMENT: 'development',
        IMAGE_TAG: imageTag,
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
    });

    // Grant Lambda permissions to pull from ECR
    this.ecrRepo.grantPull(this.lambdaFunction);

    // Apply tags to Lambda
    Tags.of(this.lambdaFunction).add('Environment', 'Development');
    Tags.of(this.lambdaFunction).add('Project', 'Container Lambda');
  }

  private createLambdaRole(bucketName: string, secretArn: string): iam.Role {
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
      ],
    });

    // Grant access to S3 bucket and Secrets Manager
    const bucketArn = `arn:aws:s3:::${bucketName}`;
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject', 's3:PutObject'],
        resources: [bucketArn, `${bucketArn}/*`],
      })
    );

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [secretArn],
      })
    );

    // Apply tags to IAM Role
    Tags.of(lambdaRole).add('Environment', 'Development');
    Tags.of(lambdaRole).add('Project', 'Lambda Container Role');

    return lambdaRole;
  }
}
