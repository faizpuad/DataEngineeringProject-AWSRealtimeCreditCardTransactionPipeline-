#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
// import { MyStack } from '../lib/stack';
import { AwsHandsonStack } from '../lib/aws-handson-stack';

const app = new cdk.App();

// Get environment variables with validation
const environment = process.env.ENVIRONMENT || 'dev';
const account = process.env.AWS_ACCOUNT_ID;
const region = process.env.AWS_REGION;

// Validate required environment variables
if (!account || !region) {
  throw new Error('AWS_ACCOUNT_ID and AWS_REGION must be provided');
}

// Create environment-specific tags
const commonTags = {
  Environment: environment,
  Project: 'CDKGithubAction',
  ManagedBy: 'CDK'
};

// Create the stack with proper naming and tagging
new AwsHandsonStack(app, `${environment}-stack`, {
  env: {
    account: account,
    region: region
  },
  stackName: `cdk-github-action-${environment}`,
  tags: commonTags,
  description: `Infrastructure stack for ${environment} environment`
});

app.synth();