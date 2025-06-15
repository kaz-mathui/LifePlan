# ALB用のセキュリティグループ
resource "aws_security_group" "alb" {
  name        = "lifeplan-alb-sg"
  description = "Security group for the ALB"
  vpc_id      = data.terraform_remote_state.base.outputs.vpc_id

  ingress {
    protocol    = "tcp"
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "lifeplan-alb-sg"
  }
}


# Application Load Balancer
resource "aws_lb" "main" {
  name               = "lifeplan-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.terraform_remote_state.base.outputs.public_subnet_ids

  enable_deletion_protection = false

  tags = {
    Name = "lifeplan-alb"
  }
}

# ターゲットグループ (Frontend)
resource "aws_lb_target_group" "frontend" {
  name     = "lifeplan-frontend-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = data.terraform_remote_state.base.outputs.vpc_id
  target_type = "ip"

  health_check {
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

# ターゲットグループ (Backend)
resource "aws_lb_target_group" "backend" {
  name     = "lifeplan-backend-tg"
  port     = 3001
  protocol = "HTTP"
  vpc_id   = data.terraform_remote_state.base.outputs.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/health" # バックエンドにヘルスチェック用エンドポイントが必要
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

# ALBリスナー (HTTP)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# ALBリスナールール (Backendへのルーティング)
resource "aws_lb_listener_rule" "backend" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
} 
