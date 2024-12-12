import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as logs from 'aws-cdk-lib/aws-logs'; 
import { Tags } from 'aws-cdk-lib'; 

// Define the basic properties required for creating an RDS PostgreSQL instance
interface RdsPostgresProps {
  vpcName?: string; // Optional custom VPC name
  dbName?: string; // Optional custom database name
  instanceIdentifier?: string; // Optional custom instance identifier
  dbUsername: string; // Database username (secret management required)
  dbPassword: string; // Database password (from secure source)
}

export class RdsPostgresConstruct extends Construct {
  public readonly dbInstance: rds.DatabaseInstance; // The RDS instance object
  public readonly vpc: ec2.Vpc; // Virtual Private Cloud for the database
  public readonly dbSecurityGroup: ec2.SecurityGroup; // Security group for the RDS instance
  public readonly logGroup: logs.LogGroup; // Log group for RDS instance logs

  constructor(scope: Construct, id: string, props: RdsPostgresProps) {
    super(scope, id);

    // Step 1: Set up a VPC to host the RDS instance
    // This is typically a public VPC for development or testing purposes, with no NAT gateways to save costs.
    this.vpc = new ec2.Vpc(this, 'PostgresVpc', {
      maxAzs: 2, // Multi-AZ setup for higher availability (can be adjusted)
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public', // Subnet for development access
          subnetType: ec2.SubnetType.PUBLIC,
        }
      ],
      natGateways: 0, // No NAT Gateways to save costs (can be adjusted for production)
      vpcName: props.vpcName || 'postgres-vpc'
    });

    // Step 2: Create a security group for RDS to control inbound/outbound traffic
    // A basic security group that allows PostgreSQL traffic from any IP in development (limit for production)
    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'PostgresSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for PostgreSQL RDS instance',
      allowAllOutbound: true,
      securityGroupName: 'postgres-security-group'
    });

    this.dbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(), 
      ec2.Port.tcp(5432), // Allow PostgreSQL traffic (be cautious in production)
      'Allow PostgreSQL access from anywhere (Development only)'
    );

    // Step 3: Create custom parameter group for PostgreSQL tuning
    // Adjust settings for free-tier performance (e.g., max connections, buffer sizes)
    const parameterGroup = new rds.ParameterGroup(this, 'PostgresParameters', {
      engine: rds.DatabaseInstanceEngine.postgres({ 
        version: rds.PostgresEngineVersion.VER_15 
      }),
      parameters: {
        'max_connections': '100',
        'shared_buffers': '16384', 
        'work_mem': '4096', 
        'maintenance_work_mem': '64000', 
        'effective_cache_size': '49152', 
        'shared_preload_libraries': 'pg_stat_statements',
        'timezone': 'UTC'
      },
      description: 'Custom parameter group for PostgreSQL 15'
    });

    // Step 4: Set up CloudWatch Log Group for RDS logs
    // Enable logging for monitoring RDS performance, errors, and queries
    const logGroup = new logs.LogGroup(this, 'RdsLogGroup', { 
      logGroupName: '/aws/rds/instance/' + (props.instanceIdentifier || 'postgres-dev-instance') + '/logs',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Adjust for production environments
    });

    // Step 5: Create the RDS PostgreSQL instance
    // Basic instance configuration for a PostgreSQL database
    this.dbInstance = new rds.DatabaseInstance(this, 'PostgresInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO), // Free tier instance type
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC // Use public subnet for development access
      },
      instanceIdentifier: props.instanceIdentifier || 'postgres-dev-instance',
      allocatedStorage: 20, // Minimum storage for free-tier
      maxAllocatedStorage: 20, // No auto-scaling for free-tier
      storageType: rds.StorageType.GP2,
      publiclyAccessible: true, // Allow external access for development purposes
      securityGroups: [this.dbSecurityGroup],
      credentials: rds.Credentials.fromUsername(props.dbUsername, {
        password: cdk.SecretValue.unsafePlainText(props.dbPassword) // Use secure secrets management
      }),
      databaseName: props.dbName || 'postgres',
      backupRetention: cdk.Duration.days(1), // Short backup retention for development
      preferredBackupWindow: '03:00-04:00', // UTC time
      preferredMaintenanceWindow: 'Mon:04:00-Mon:05:00', // UTC time
      deleteAutomatedBackups: true,
      parameterGroup: parameterGroup,
      autoMinorVersionUpgrade: true,
      multiAz: false, // Free-tier single AZ deployment
      monitoringInterval: cdk.Duration.seconds(60), // Basic monitoring
      enablePerformanceInsights: false, // Disabled for free-tier
      deletionProtection: false, 
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Cleanup for development
    });

    // Step 6: Output database connection details for use
    // Provides the RDS endpoint and port for connecting from clients
    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: this.dbInstance.instanceEndpoint.hostname,
      description: 'Database endpoint',
      exportName: 'PostgresEndpoint'
    });

    new cdk.CfnOutput(this, 'DbPort', {
      value: '5432',
      description: 'Database port',
      exportName: 'PostgresPort'
    });

    // Step 7: Optional CloudWatch Alarms (can be uncommented if required)
    // Alarms to monitor CPU, storage, and connections can be added based on requirements
    this.createCloudWatchAlarms();

    // Step 8: Add tags for resource organization
    // Tagging resources for environment and project identification
    Tags.of(logGroup).add('Environment', 'Development'); 
    Tags.of(logGroup).add('Project', 'OLTP Pipeline');
    Tags.of(this.dbInstance).add('Environment', 'Development');
    Tags.of(this.dbInstance).add('Project', 'OLTP Pipeline');
    Tags.of(this.vpc).add('Environment', 'Development');
    Tags.of(this.vpc).add('Project', 'OLTP Pipeline');
    Tags.of(this.dbSecurityGroup).add('Environment', 'Development');
    Tags.of(this.dbSecurityGroup).add('Project', 'OLTP Pipeline');
  }

  // Optional method for creating CloudWatch alarms
  private createCloudWatchAlarms() {
    // Example alarms for monitoring key database metrics
    // Adjust thresholds and actions as needed
  }

  // Helper methods to access the RDS instance connection properties
  public get dbEndpoint(): string {
    return this.dbInstance.instanceEndpoint.hostname;
  }

  public get dbPort(): string {
    return this.dbInstance.instanceEndpoint.port.toString();
  }
}