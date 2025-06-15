# --- For ALB Layer ---

output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = [aws_subnet.public_a.id, aws_subnet.public_c.id]
}

output "ecs_cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "The ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "frontend_task_definition_family" {
  description = "The family of the frontend task definition"
  value       = aws_ecs_task_definition.frontend.family
}

output "backend_task_definition_family" {
  description = "The family of the backend task definition"
  value       = aws_ecs_task_definition.backend.family
}

output "frontend_task_definition_arn" {
  description = "The ARN of the frontend task definition"
  value       = aws_ecs_task_definition.frontend.arn
}

output "backend_task_definition_arn" {
  description = "The ARN of the backend task definition"
  value       = aws_ecs_task_definition.backend.arn
}

output "ecs_tasks_sg_id" {
  description = "The ID of the security group for ECS tasks"
  value       = aws_security_group.ecs_tasks.id
}

output "route53_zone_id" {
  description = "The ID of the main Route 53 hosted zone"
  value       = aws_route53_zone.main.id
}

output "frontend_ecr_repository_name" {
  description = "The name of the frontend ECR repository"
  value       = aws_ecr_repository.frontend.name
}

output "backend_ecr_repository_name" {
  description = "The name of the backend ECR repository"
  value       = aws_ecr_repository.backend.name
}

output "frontend_ecr_repository_arn" {
  description = "The ARN of the frontend ECR repository"
  value       = aws_ecr_repository.frontend.arn
}

output "backend_ecr_repository_arn" {
  description = "The ARN of the backend ECR repository"
  value       = aws_ecr_repository.backend.arn
}

output "aws_account_id" {
  description = "The AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "app_secrets_arn" {
  description = "The ARN of the application secrets in Secrets Manager"
  value       = data.aws_secretsmanager_secret.app_secrets.arn
}

output "acm_certificate_arn" {
  description = "The ARN of the ACM certificate"
  value       = aws_acm_certificate_validation.main.certificate_arn
}

output "dockerhub_credentials_arn" {
  description = "ARN of the DockerHub credentials secret"
  value       = data.aws_secretsmanager_secret.dockerhub_credentials.arn
}

output "ecs_task_execution_role_arn" {
  description = "The ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "codestar_connection_arn" {
  description = "The ARN of the CodeStar connection to GitHub"
  value       = aws_codestarconnections_connection.github.arn
}

data "aws_caller_identity" "current" {} 
