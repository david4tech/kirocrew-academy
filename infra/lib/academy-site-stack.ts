import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';

export interface AcademySiteStackProps extends StackProps {
  readonly stackPrefix: string;
}

/**
 * Private S3 bucket fronted by CloudFront with Origin Access Control. The
 * bucket is never public; CloudFront is the only reader, per ARCHITECTURE.md
 * rule 5.
 */
export class AcademySiteStack extends Stack {
  public readonly siteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: AcademySiteStackProps) {
    super(scope, id, props);

    const { stackPrefix } = props;

    this.siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `${stackPrefix.toLowerCase()}-site-${Stack.of(this).account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // Suited to a hashed asset bundle: everything under the origin is
    // immutable by filename, so cache aggressively and let deploy-time
    // cache-control headers (set in deploy.yml) differentiate index.html.
    const cachePolicy = new cloudfront.CachePolicy(this, 'HashedAssetsCachePolicy', {
      cachePolicyName: `${stackPrefix}-hashed-assets`,
      defaultTtl: Duration.days(365),
      minTtl: Duration.days(1),
      maxTtl: Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy,
        compress: true,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    new CfnOutput(this, 'DistributionDomainName', { value: this.distribution.distributionDomainName });
    new CfnOutput(this, 'DistributionId', { value: this.distribution.distributionId });
    new CfnOutput(this, 'SiteBucketName', { value: this.siteBucket.bucketName });
  }
}
