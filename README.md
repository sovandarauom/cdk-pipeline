# Welcome to your CDK TypeScript project

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template


##### Enable JSON Resolver

```
{
    ...
    "typeRoots": [
      "./node_modules/@types"
    ],
    // to support import json file into ts
    "resolveJsonModule": true,
    "esModuleInterop": true
}
```

##### Getting Start

```
1. Make sure you have github repository
2. Create GitHub Token under developer settings
3. Update options.json file
```
##### options.json
```
{
  "manualApprovals" : true, 
  "env" : "dev",
  "gitHubRepositoryOwner": "sovandarauom",
  "gitHubRepository": "demo",
  "gitHubSecret": "",
  "gitHubBranch": "prod"
}
```