# CodeStar Connection to GitHub
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codestarconnections_connection
resource "aws_codestarconnections_connection" "github" {
  provider_type = "GitHub"
  name          = "github-connection"
}

# CodePipeline will be defined below after this connection is established. 

# --- IAM Roles and Policies for CodePipeline/CodeBuild ---

data "aws_iam_policy_document" "codebuild_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codebuild.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "codebuild_role" {
  name               = "lifeplan-codebuild-role"
  assume_role_policy = data.aws_iam_policy_document.codebuild_assume_role.json
}

data "aws_iam_policy_document" "codebuild_policy" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage"
    ]
    resources = [
      data.terraform_remote_state.base.outputs.frontend_ecr_repository_arn,
      data.terraform_remote_state.base.outputs.backend_ecr_repository_arn
    ]
  }
  
  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [data.terraform_remote_state.base.outputs.app_secrets_arn]
  }
  
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:GetBucketVersioning",
      "s3:PutObject",
      "s3:PutObjectAcl"
    ]
    resources = [
      aws_s3_bucket.codepipeline_artifacts.arn,
      "${aws_s3_bucket.codepipeline_artifacts.arn}/*",
    ]
  }
  
  statement {
    effect = "Allow"
    actions = [
        "ecs:DescribeServices",
        "ecs:UpdateService"
    ]
    resources = [
        aws_ecs_service.frontend.id,
        aws_ecs_service.backend.id
    ]
  }
}

resource "aws_iam_role_policy" "codebuild_policy" {
  role   = aws_iam_role.codebuild_role.name
  policy = data.aws_iam_policy_document.codebuild_policy.json
}

# --- CodeBuild Project ---
resource "aws_codebuild_project" "main" {
  name          = "lifeplan-codebuild-project"
  description   = "Builds and pushes Docker images to ECR"
  service_role  = aws_iam_role.codebuild_role.arn
  build_timeout = "20"
  
  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:5.0"
    type                        = "LINUX_CONTAINER"
    privileged_mode             = true
    image_pull_credentials_type = "CODEBUILD"
    
    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }
    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = data.terraform_remote_state.base.outputs.aws_account_id
    }
    environment_variable {
      name  = "FRONTEND_IMAGE_REPO_NAME"
      value = data.terraform_remote_state.base.outputs.frontend_ecr_repository_name
    }
    environment_variable {
      name  = "BACKEND_IMAGE_REPO_NAME"
      value = data.terraform_remote_state.base.outputs.backend_ecr_repository_name
    }
    environment_variable {
      name  = "FRONTEND_TASK_DEFINITION_ARN"
      value = data.terraform_remote_state.base.outputs.frontend_task_definition_arn
    }
    environment_variable {
      name  = "BACKEND_TASK_DEFINITION_ARN"
      value = data.terraform_remote_state.base.outputs.backend_task_definition_arn
    }
    environment_variable {
      name  = "CLUSTER_NAME"
      value = data.terraform_remote_state.base.outputs.ecs_cluster_name
    }
    environment_variable {
      name  = "FRONTEND_SERVICE_NAME"
      value = aws_ecs_service.frontend.name
    }
    environment_variable {
      name  = "BACKEND_SERVICE_NAME"
      value = aws_ecs_service.backend.name
    }
  }
  
  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec.yml"
  }
}

# --- CodePipeline ---
resource "aws_codepipeline" "main" {
  name           = "lifeplan-pipeline"
  pipeline_type  = "V2"
  role_arn       = aws_iam_role.codepipeline_role.arn

  tags = {
    "SourceTriggerUpdate" = "1"
  }

  artifact_store {
    type     = "S3"
    location = aws_s3_bucket.codepipeline_artifacts.bucket
  }

  trigger {
    provider_type = "CodeStarSourceConnection"
    git_configuration {
      source_action_name = "Source"
      push {
        branches {
          includes = ["main"]
        }
      }
    }
  }

  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]
      
      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github.arn
        FullRepositoryId = "Kazushi-T/LifePlan"
        BranchName       = "main"
      }
    }
  }

  stage {
    name = "Build"
    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]

      configuration = {
        ProjectName = aws_codebuild_project.main.name
      }
    }
  }

  stage {
    name = "Deploy"
    action {
      name     = "DeployFrontend"
      category = "Deploy"
      owner    = "AWS"
      provider = "ECS"
      version  = "1"

      input_artifacts = ["build_output"]

      configuration = {
        ClusterName = data.terraform_remote_state.base.outputs.ecs_cluster_name
        ServiceName = aws_ecs_service.frontend.name
        FileName    = "imagedefinitions-frontend.json"
      }
    }
    action {
      name     = "DeployBackend"
      category = "Deploy"
      owner    = "AWS"
      provider = "ECS"
      version  = "1"

      input_artifacts = ["build_output"]

      configuration = {
        ClusterName = data.terraform_remote_state.base.outputs.ecs_cluster_name
        ServiceName = aws_ecs_service.backend.name
        FileName    = "imagedefinitions-backend.json"
      }
    }
  }
}

# --- S3 Bucket for CodePipeline artifacts ---
resource "aws_s3_bucket" "codepipeline_artifacts" {
  bucket = "lifeplan-codepipeline-artifacts-${data.terraform_remote_state.base.outputs.aws_account_id}"
}

# --- IAM Role for CodePipeline ---
data "aws_iam_policy_document" "codepipeline_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codepipeline.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "codepipeline_role" {
  name               = "lifeplan-codepipeline-role"
  assume_role_policy = data.aws_iam_policy_document.codepipeline_assume_role.json
}

data "aws_iam_policy_document" "codepipeline_policy" {
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
    resources = [
      aws_s3_bucket.codepipeline_artifacts.arn,
      "${aws_s3_bucket.codepipeline_artifacts.arn}/*"
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "codestar-connections:UseConnection"
    ]
    resources = [aws_codestarconnections_connection.github.arn]
  }

  statement {
    effect   = "Allow"
    actions  = ["codebuild:StartBuild", "codebuild:BatchGetBuilds"]
    resources = [aws_codebuild_project.main.arn]
  }

  statement {
    effect = "Allow"
    actions = [
      "ecs:DescribeServices",
      "ecs:DescribeTaskDefinition",
      "ecs:DescribeTasks",
      "ecs:ListTasks",
      "ecs:RegisterTaskDefinition",
      "ecs:UpdateService"
    ]
    resources = [
      aws_ecs_service.frontend.id,
      aws_ecs_service.backend.id,
      data.terraform_remote_state.base.outputs.frontend_task_definition_arn,
      data.terraform_remote_state.base.outputs.backend_task_definition_arn
    ]
  }
}

resource "aws_iam_role_policy" "codepipeline_policy" {
  role   = aws_iam_role.codepipeline_role.name
  policy = data.aws_iam_policy_document.codepipeline_policy.json
}

# --- Data source for current AWS account ID ---
data "aws_caller_identity" "current" {}
 