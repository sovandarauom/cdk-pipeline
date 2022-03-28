import { SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib'
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineAction from 'aws-cdk-lib/aws-codepipeline-actions';

import option from '../config/options.json';

export class CdkPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const repository = new ecr.Repository(this, 'cicd-demo-repository', {
      repositoryName: 'cicd/demo',
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    const repositoryUrl = repository.repositoryUri;
    const ecrRepoName = repository.repositoryName;
    const ecrRepositoryArn = repository.repositoryArn;

    const pipelineProject = new codebuild.PipelineProject(this, `${option.env}-app-pipeline-project`, {
      projectName: `${option.env}-demo`,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
        privileged: true,
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'echo Logging in to Amazon ECR...',
              `aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin ${repositoryUrl}`,
              'COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-15)',
              // eslint-disable-next-line no-template-curly-in-string
              'IMAGE_TAG=${COMMIT_HASH:=latest}',
            ],
          },
          build: {
            commands: [
              'echo Build started on `date`',
              `echo Building Docker Image ${repositoryUrl}:latest`,
              `docker build -t ${repositoryUrl}:latest .`,
              `echo Tagging Docker Image ${repositoryUrl}:latest with ${repositoryUrl}:$IMAGE_TAG`,
              `docker tag ${repositoryUrl}:latest ${repositoryUrl}:$IMAGE_TAG`,
              `echo Pushing Docker Image to ${repositoryUrl}:latest and ${repositoryUrl}:$IMAGE_TAG`,
              'echo Pushing the Docker image...',
              `docker push ${repositoryUrl}:latest`,
              `docker push ${repositoryUrl}:$IMAGE_TAG`,
            ],
          },
          post_build: {
            commands: [
              'echo creating image-definitions.json dynamically',
              `printf '[{"name":"${ecrRepoName}","imageUri": "${repositoryUrl}:latest"}]' > image-definitions.json`,
              'echo Build completed on `date`',
            ],
          },
        },
        artifacts: {
          files: [
            'image-definitions.json',
          ],
        },
      }),
    });

    pipelineProject.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: [
        'ecr:GetAuthorizationToken',
      ],
    }));

    pipelineProject.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [ecrRepositoryArn],
      actions: [
        'ecr:BatchCheckLayerAvailability',
        'ecr:CompleteLayerUpload',
        'ecr:InitiateLayerUpload',
        'ecr:PutImage',
        'ecr:UploadLayerPart',
      ],
    }));

    const sourceArtifact = new codepipeline.Artifact();
    const buildArtifact = new codepipeline.Artifact();

    const sourceAction = new codepipelineAction.GitHubSourceAction({
      actionName: 'GithubSource',
      output: sourceArtifact,
      oauthToken: SecretValue.plainText(option.gitHubSecret),
      trigger: codepipelineAction.GitHubTrigger.POLL,
      owner: option.gitHubRepositoryOwner,
      repo: option.gitHubRepository,
      branch: option.gitHubBranch,
    });

    const buildAction = new codepipelineAction.CodeBuildAction({
      actionName: 'Build',
      project: pipelineProject,
      input: sourceArtifact,
      outputs: [buildArtifact],
    });

    const pipeline = new codepipeline.Pipeline(this, `${option.env}-demo-app-pipeline`, {
      pipelineName: `${option.env}-demo-github-pipeline`,
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction],
        },
      ],
    });

    if (option.manualApprovals) {
      const manualApprovalAction = new codepipelineAction.ManualApprovalAction({
        actionName: 'ApproveChanges',
      });
      pipeline.addStage({
        stageName: 'Approval',
        actions: [manualApprovalAction],
      });
      pipeline.addStage({
        stageName: 'Build',
        actions: [buildAction],
      });
    } else {
      pipeline.addStage({
        stageName: 'Build',
        actions: [buildAction],
      });
    }
  }
}
