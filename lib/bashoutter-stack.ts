import * as cdk from '@aws-cdk/core';
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3_deploy from '@aws-cdk/aws-s3-deployment';
import * as _lambda from '@aws-cdk/aws-lambda';
import * as ssm from '@aws-cdk/aws-ssm';
import * as apigw from '@aws-cdk/aws-apigateway';

export class BashoutterStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new ddb.Table(this, "Bashoutter-Table", {
      partitionKey: {
        name: "item_id",
        type: ddb.AttributeType.STRING
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    const bucket = new s3.Bucket(this, "Bashoutter-Bucket", {
      websiteIndexDocument: "index.html",
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })
    new s3_deploy.BucketDeployment(this, "BucketDeployment", {
      destinationBucket: bucket,
      sources: [s3_deploy.Source.asset("../gui/dist")],
      retainOnDelete: false
    })

    const common_params = {
      "runtime": _lambda.Runtime.PYTHON_3_7,
      "environment": {
        "TABLE_NAME": table.tableName
      }
    }

    const get_haiku_lambda = new _lambda.Function(this, "GetHaiku", {
      runtime: common_params.runtime,
      code: _lambda.Code.fromAsset("api"),
      handler: "api.get_haiku",
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
      environment: common_params.environment
    })
    const post_haiku_lambda = new _lambda.Function(this, "PostHaiku", {
      runtime: common_params.runtime,
      code: _lambda.Code.fromAsset("api"),
      handler: "api.post_haiku",
      environment: common_params.environment
    })
    const patch_haiku_lambda = new _lambda.Function(this, "PatchHaiku", {
      runtime: common_params.runtime,
      code: _lambda.Code.fromAsset("api"),
      handler: "api.patch_haiku",
      environment: common_params.environment
    })
    const delete_haiku_lambda = new _lambda.Function(this, "DeleteHaiku", {
      runtime: common_params.runtime,
      code: _lambda.Code.fromAsset("api"),
      handler: "api.delete_haiku",
      environment: common_params.environment
    })

    table.grantReadData(get_haiku_lambda)
    table.grantReadWriteData(post_haiku_lambda)
    table.grantReadWriteData(patch_haiku_lambda)
    table.grantReadWriteData(delete_haiku_lambda)

    const api = new apigw.RestApi(this, "BashoutterApi", {
      defaultCorsPreflightOptions:  {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS
      }
    })

    const haiku = api.root.addResource("haiku")
    haiku.addMethod(
      "GET",
      new apigw.LambdaIntegration(get_haiku_lambda)
    )
    haiku.addMethod(
      "POST",
      new apigw.LambdaIntegration(post_haiku_lambda)
    )

    const haiku_item_id = haiku.addResource("{item_id}")
    haiku_item_id.addMethod(
      "PATCH",
      new apigw.LambdaIntegration(patch_haiku_lambda)
    )
    haiku_item_id.addMethod(
      "DELETE",
      new apigw.LambdaIntegration(delete_haiku_lambda)
    )

    new ssm.StringParameter(this, "TABLE_NAME", {
      parameterName: "TABLE_NAME",
      stringValue: table.tableName
    })
    new ssm.StringParameter(this, "ENDPOINT_URL", {
      parameterName: "ENDPOINT_URL",
      stringValue: api.url
    })

    new cdk.CfnOutput(this, "BucketUrl", {
      value: bucket.bucketWebsiteDomainName
    })
  }
}
