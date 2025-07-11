# ------------------------------------------------------------------------------
# IAM for CodeBuild
# ------------------------------------------------------------------------------
resource "aws_iam_role" "codebuild_role" {
  name               = "lifeplan-codebuild-role"
  assume_role_policy = data.aws_iam_policy_document.codebuild_assume_role.json
}

data "aws_iam_policy_document" "codebuild_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codebuild.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "codebuild_policy" {
  name   = "lifeplan-codebuild-policy"
  role   = aws_iam_role.codebuild_role.id
  policy = data.aws_iam_policy_document.codebuild_policy.json
}

# ------------------------------------------------------------------------------
# IAM for CodePipeline
# ------------------------------------------------------------------------------
resource "aws_iam_role" "codepipeline_role" {
  name               = "lifeplan-codepipeline-role"
  assume_role_policy = data.aws_iam_policy_document.codepipeline_assume_role.json
}

data "aws_iam_policy_document" "codepipeline_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codepipeline.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "codepipeline_policy" {
  name   = "lifeplan-codepipeline-policy"
  role   = aws_iam_role.codepipeline_role.id
  policy = data.aws_iam_policy_document.codepipeline_policy.json
}

resource "aws_iam_role_policy_attachment" "codepipeline_ecs_full_access" {
  role       = aws_iam_role.codepipeline_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonECS_FullAccess"
}

# ------------------------------------------------------------------------------
# IAM Policies Definitions
# ------------------------------------------------------------------------------
data "aws_iam_policy_document" "codebuild_policy" {
  statement {
    sid       = "CloudWatchLogs"
    effect    = "Allow"
    actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["*"]
  }
  statement {
    sid       = "ECRLogin"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    sid    = "ECRAccess"
    effect = "Allow"
    actions = [
      "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage", "ecr:BatchCheckLayerAvailability",
      "ecr:PutImage", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload"
    ]
    resources = [
      data.terraform_remote_state.base.outputs.frontend_ecr_repository_arn,
      data.terraform_remote_state.base.outputs.backend_ecr_repository_arn
    ]
  }
  statement {
    sid       = "SecretsManagerAccess"
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [data.terraform_remote_state.base.outputs.app_secrets_arn]
  }
  statement {
    sid       = "DockerHubCredentials"
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [data.terraform_remote_state.base.outputs.dockerhub_credentials_arn]
  }
  statement {
    sid       = "S3Artifacts"
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:GetBucketVersioning", "s3:GetObjectVersion", "s3:PutObjectAcl"]
    resources = [aws_s3_bucket.codepipeline_artifacts.arn, "${aws_s3_bucket.codepipeline_artifacts.arn}/*"]
  }
  statement {
    sid    = "ECSServiceUpdate"
    effect = "Allow"
    actions = ["ecs:DescribeServices", "ecs:UpdateService"]
    resources = [
      aws_ecs_service.frontend.id,
      aws_ecs_service.backend.id
    ]
  }
}

data "aws_iam_policy_document" "codepipeline_policy" {
  statement {
    sid    = "S3Access"
    effect = "Allow"
    actions   = ["s3:GetObject", "s3:ListBucket", "s3:PutObject"]
    resources = [
      aws_s3_bucket.codepipeline_artifacts.arn,
      "${aws_s3_bucket.codepipeline_artifacts.arn}/*",
    ]
  }
  statement {
    sid       = "CodeStarConnection"
    effect    = "Allow"
    actions   = ["codestar-connections:UseConnection"]
    resources = [data.terraform_remote_state.base.outputs.codestar_connection_arn]
  }
  statement {
    sid       = "CodeBuildAccess"
    effect    = "Allow"
    actions   = ["codebuild:StartBuild", "codebuild:BatchGetBuilds"]
    resources = [aws_codebuild_project.main.arn]
  }
  statement {
    sid    = "ECSAccessAndPassRole"
    effect = "Allow"
    actions = [
      "ecs:DescribeServices",
      "ecs:DescribeTaskDefinition",
      "ecs:DescribeTasks",
      "ecs:ListTasks",
      "ecs:RegisterTaskDefinition",
      "ecs:UpdateService",
      "iam:PassRole"
    ]
    resources = [
      data.terraform_remote_state.base.outputs.ecs_cluster_arn,
      aws_ecs_service.frontend.id,
      aws_ecs_service.backend.id,
      "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:task-definition/${data.terraform_remote_state.base.outputs.frontend_task_definition_family}:*",
      "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:task-definition/${data.terraform_remote_state.base.outputs.backend_task_definition_family}:*",
      data.terraform_remote_state.base.outputs.ecs_task_execution_role_arn,
    ]
  }
}
 