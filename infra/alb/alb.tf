# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${local.prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.lb.id]
  subnets            = data.terraform_remote_state.base.outputs.public_subnet_ids

  enable_deletion_protection = false

  tags = local.tags
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

# Listener for HTTP, redirecting to HTTPS
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# Listener for HTTPS, forwarding to the frontend by default
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.terraform_remote_state.base.outputs.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# ALB listener rule for routing to the backend
resource "aws_lb_listener_rule" "backend" {
  listener_arn = aws_lb_listener.https.arn # Changed to HTTPS listener
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
