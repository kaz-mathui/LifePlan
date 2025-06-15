# ------------------------------------------------------------------------------
# CodePipeline Resources
# ------------------------------------------------------------------------------

# S3 Bucket for CodePipeline artifacts
resource "aws_s3_bucket" "codepipeline_artifacts" {
  bucket = "lifeplan-codepipeline-artifacts-${data.aws_caller_identity.current.account_id}"
}

# CodeStar Connection to GitHub
resource "aws_codestarconnections_connection" "github" {
  provider_type = "GitHub"
  name          = "github-connection"
}

# CodeBuild Project
resource "aws_codebuild_project" "main" {
  name          = "lifeplan-codebuild-project"
  description   = "Builds and pushes Docker images to ECR"
  service_role  = aws_iam_role.codebuild_role.arn
  build_timeout = 20 # minutes

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
      value = "ap-northeast-1"
    }
    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = data.aws_caller_identity.current.account_id
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
      name  = "DOCKERHUB_USERNAME"
      value = "kazmathui" # Please modify this if your username is different.
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec.yml"
  }
}

# CodePipeline
resource "aws_codepipeline" "main" {
  name     = "lifeplan-pipeline"
  role_arn = aws_iam_role.codepipeline_role.arn
  pipeline_type = "V2"

  artifact_store {
    type     = "S3"
    location = aws_s3_bucket.codepipeline_artifacts.bucket
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
        FullRepositoryId = "kaz-mathui/LifePlan"
        BranchName       = "main"
      }
    }
  }

  stage {
    name = "Build"
    action {
      name            = "Build"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["source_output"]
      output_artifacts = ["build_output"]
      configuration = {
        ProjectName = aws_codebuild_project.main.name
      }
    }
  }

  stage {
    name = "Deploy"
    action {
      name            = "DeployFrontend"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      version         = "1"
      input_artifacts = ["build_output"]
      configuration = {
        ClusterName = data.terraform_remote_state.base.outputs.ecs_cluster_name
        ServiceName = aws_ecs_service.frontend.name
        FileName    = "imagedefinitions-frontend.json"
      }
    }
    action {
      name            = "DeployBackend"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      version         = "1"
      input_artifacts = ["build_output"]
      configuration = {
        ClusterName = data.terraform_remote_state.base.outputs.ecs_cluster_name
        ServiceName = aws_ecs_service.backend.name
        FileName    = "imagedefinitions-backend.json"
      }
    }
  }
}

# --- Data source for current AWS account ID ---
data "aws_caller_identity" "current" {}
 