resource "aws_security_group_rule" "allow_alb_to_ecs" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "tcp"
  security_group_id        = data.terraform_remote_state.base.outputs.ecs_tasks_sg_id
  source_security_group_id = aws_security_group.alb.id
  description              = "Allow traffic from ALB to ECS tasks"
} 
