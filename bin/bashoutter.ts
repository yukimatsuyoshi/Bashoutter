#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { BashoutterStack } from '../lib/bashoutter-stack';

const app = new cdk.App();
new BashoutterStack(app, 'BashoutterStack');
