# ECSタスク実行ロール
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "lifeplan-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Action    = "sts:AssumeRole",
        Effect    = "Allow",
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "lifeplan-ecs-task-execution-role"
  }
}

# ECSタスク実行ロールに必要なポリシーをアタッチ
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_region" "current" {}

# Secrets Managerからシークレットを読み取るためのインラインポリシー
resource "aws_iam_role_policy" "ecs_secrets_policy" {
  name = "lifeplan-ecs-secrets-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "secretsmanager:GetSecretValue"
        ],
        Resource = [
          data.aws_secretsmanager_secret.app_secrets.arn
        ]
      },
      {
        Effect = "Allow",
        Action = "kms:Decrypt",
        Resource = "*",
        Condition = {
          "StringEquals" = {
            "kms:ViaService" = "secretsmanager.${data.aws_region.current.name}.amazonaws.com"
          }
        }
      }
    ]
  })
} 
