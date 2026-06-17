#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_cdk_lib_1 = require("aws-cdk-lib");
const processcanvas_stack_1 = require("../lib/processcanvas-stack");
const app = new aws_cdk_lib_1.App();
new processcanvas_stack_1.ProcessCanvasStack(app, "ProcessCanvasStack", {
    env: { region: process.env.CDK_DEFAULT_REGION || "us-east-1" },
});
