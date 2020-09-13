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
      sources: [s3_deploy.Source.asset("./gui/dist")],
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
  }
}
