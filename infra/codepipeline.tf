# CodeStar Connection to GitHub
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codestarconnections_connection
resource "aws_codestarconnections_connection" "github" {
  provider_type = "GitHub"
  name          = "github-connection-for-lifeplan"
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
      "ecr:PutImage",
    ]
    resources = ["*"]
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
  role   = aws_iam_role.codebuild_role.id
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
      name  = "AWS_ACCOUNT_ID"
      value = data.aws_caller_identity.current.account_id
    }
    environment_variable {
        name = "AWS_DEFAULT_REGION"
        value = "ap-northeast-1"
    }
    environment_variable {
      name  = "FRONTEND_IMAGE_REPO_URL"
      value = aws_ecr_repository.frontend.repository_url
    }
    environment_variable {
      name  = "BACKEND_IMAGE_REPO_URL"
      value = aws_ecr_repository.backend.repository_url
    }
    environment_variable {
        name = "FRONTEND_TASK_DEFINITION_FAMILY"
        value = aws_ecs_task_definition.frontend.family
    }
    environment_variable {
        name = "BACKEND_TASK_DEFINITION_FAMILY"
        value = aws_ecs_task_definition.backend.family
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
        # Temporarily removing branch filter for debugging
        # branches {
        #   includes = ["main"]
        # }
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
      output_artifacts = ["SourceArtifact"]
      
      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github.arn
        FullRepositoryId = "kaz-mathui/LifePlan"
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
      input_artifacts  = ["SourceArtifact"]
      output_artifacts = ["BuildArtifact"]

      configuration = {
        ProjectName = aws_codebuild_project.main.name
      }
    }
  }

  stage {
    name = "Deploy"
    action {
      name            = "DeployToECS"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      version         = "1"
      input_artifacts = ["BuildArtifact"]

      configuration = {
        ClusterName = aws_ecs_cluster.main.name
        ServiceName = aws_ecs_service.frontend.name
        FileName    = "imagedefinitions-frontend.json"
      }
    }
    action {
        name = "DeployToECSBackend"
        category = "Deploy"
        owner = "AWS"
        provider = "ECS"
        version = "1"
        input_artifacts = ["BuildArtifact"]

        configuration = {
            ClusterName = aws_ecs_cluster.main.name
            ServiceName = aws_ecs_service.backend.name
            FileName = "imagedefinitions-backend.json"
        }
    }
  }
}

# --- S3 Bucket for CodePipeline artifacts ---
resource "aws_s3_bucket" "codepipeline_artifacts" {
  bucket = "lifeplan-codepipeline-artifacts-${data.aws_caller_identity.current.account_id}"
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
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:GetBucketVersioning",
      "s3:PutObjectAcl",
      "s3:PutObject",
    ]
    resources = [
      aws_s3_bucket.codepipeline_artifacts.arn,
      "${aws_s3_bucket.codepipeline_artifacts.arn}/*",
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "codestar-connections:UseConnection",
    ]
    resources = [aws_codestarconnections_connection.github.arn]
  }

  statement {
    effect = "Allow"
    actions = [
      "codebuild:StartBuild",
      "codebuild:BatchGetBuilds",
    ]
    resources = [aws_codebuild_project.main.arn]
  }

  statement {
    effect = "Allow"
    actions = [
      "ecs:DescribeServices",
      "ecs:UpdateService",
      "iam:PassRole",
    ]
    resources = [
      aws_ecs_service.frontend.id,
      aws_ecs_service.backend.id,
      aws_iam_role.ecs_task_execution_role.arn,
    ]
  }
}

resource "aws_iam_role_policy" "codepipeline_policy" {
  role   = aws_iam_role.codepipeline_role.id
  policy = data.aws_iam_policy_document.codepipeline_policy.json
}

# --- Data source for current AWS account ID ---
data "aws_caller_identity" "current" {}
 