# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "lifeplan-cluster"

  tags = {
    Name      = "lifeplan-cluster"
    ManagedBy = "Terraform"
  }
}

# ECSタスク用のセキュリティグループ
resource "aws_security_group" "ecs_tasks" {
  name        = "lifeplan-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.main.id

  # ALBからのトラフィックルールは `alb` レイヤーで定義される
  # ingress {}

  # すべてのアウトバウンドトラフィックを許可
  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "lifeplan-ecs-tasks-sg"
  }
}


# --- Frontend Service ---
resource "aws_ecs_task_definition" "frontend" {
  family                   = "lifeplan-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "lifeplan-frontend"
      image     = "${aws_ecr_repository.frontend.repository_url}:latest" # CodeDeployが更新
      essential = true
      portMappings = [
        {
          containerPort = 80
          hostPort      = 80
        }
      ],
      logConfiguration = {
        logDriver = "awslogs",
        options = {
          # awslogs-group は base 層で管理
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name, 
          "awslogs-region"        = data.aws_region.current.name,
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

# --- Backend Service ---
resource "aws_ecs_task_definition" "backend" {
  family                   = "lifeplan-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "lifeplan-backend"
      image     = "${aws_ecr_repository.backend.repository_url}:latest" # CodeDeployが更新
      essential = true
      portMappings = [
        {
          containerPort = 3001
          hostPort      = 3001
        }
      ],
      secrets = [
        {
          name      = local.backend_secret_key,
          valueFrom = "${data.aws_secretsmanager_secret.app_secrets.arn}:${local.backend_secret_key}::"
        }
      ],
      logConfiguration = {
        logDriver = "awslogs",
        options = {
          # awslogs-group は base 層で管理
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name,
          "awslogs-region"        = data.aws_region.current.name,
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
} 
