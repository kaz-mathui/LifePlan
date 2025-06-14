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

  # ALBからのトラフィックを許可
  ingress {
    protocol        = "tcp"
    from_port       = 0
    to_port         = 65535
    security_groups = [aws_security_group.alb.id]
  }

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
      secrets = [
        for key in local.frontend_secret_keys : {
          name      = key
          valueFrom = "${data.aws_secretsmanager_secret.app_secrets.arn}:${key}::"
        }
      ],
      logConfiguration = {
        logDriver = "awslogs",
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name,
          "awslogs-region"        = data.aws_region.current.name,
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "frontend" {
  name            = "lifeplan-frontend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = [aws_subnet.public_a.id, aws_subnet.public_c.id]
    security_groups = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  dynamic "load_balancer" {
    for_each = var.create_alb ? [1] : []
    content {
      target_group_arn = aws_lb_target_group.frontend[0].arn
      container_name   = "lifeplan-frontend"
      container_port   = 80
    }
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [aws_lb_listener.http]
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
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name,
          "awslogs-region"        = data.aws_region.current.name,
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "backend" {
  name            = "lifeplan-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = [aws_subnet.public_a.id, aws_subnet.public_c.id]
    security_groups = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  dynamic "load_balancer" {
    for_each = var.create_alb ? [1] : []
    content {
      target_group_arn = aws_lb_target_group.backend[0].arn
      container_name   = "lifeplan-backend"
      container_port   = 3001
    }
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [aws_lb_listener.http]
} 
 