#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { ProcessCanvasStack } from "../lib/processcanvas-stack";

const app = new App();
new ProcessCanvasStack(app, "ProcessCanvasStack", {
  env: { region: process.env.CDK_DEFAULT_REGION || "us-east-1" },
});
