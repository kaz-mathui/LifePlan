# --- Frontend Service ---
resource "aws_ecs_service" "frontend" {
  name            = "lifeplan-frontend-service"
  cluster         = data.terraform_remote_state.base.outputs.ecs_cluster_name
  task_definition = data.terraform_remote_state.base.outputs.frontend_task_definition_arn
  desired_count   = 1 # ALBと一緒に起動するので、常に1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = data.terraform_remote_state.base.outputs.public_subnet_ids
    security_groups = [data.terraform_remote_state.base.outputs.ecs_tasks_sg_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "lifeplan-frontend"
    container_port   = 80
  }

  # depends_on は、もはや不要なはず
}


# --- Backend Service ---
resource "aws_ecs_service" "backend" {
  name            = "lifeplan-backend-service"
  cluster         = data.terraform_remote_state.base.outputs.ecs_cluster_name
  task_definition = data.terraform_remote_state.base.outputs.backend_task_definition_arn
  desired_count   = 1 # ALBと一緒に起動するので、常に1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = data.terraform_remote_state.base.outputs.public_subnet_ids
    security_groups = [data.terraform_remote_state.base.outputs.ecs_tasks_sg_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "lifeplan-backend"
    container_port   = 3001
  }

  # depends_on は、もはや不要なはず
} 
 