# --- Frontend Log Group ---
resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/lifeplan-frontend"
  retention_in_days = 7

  tags = {
    Name = "lifeplan-frontend-logs"
  }
}

# --- Backend Log Group ---
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/lifeplan-backend"
  retention_in_days = 7

  tags = {
    Name = "lifeplan-backend-logs"
  }
} 
