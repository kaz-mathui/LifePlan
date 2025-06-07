# Frontend ECR Repository
resource "aws_ecr_repository" "frontend" {
  name                 = "lifeplan/frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name      = "LifePlan Frontend"
    Service   = "LifePlan"
    ManagedBy = "Terraform"
  }
}

# Backend ECR Repository
resource "aws_ecr_repository" "backend" {
  name                 = "lifeplan/backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name      = "LifePlan Backend"
    Service   = "LifePlan"
    ManagedBy = "Terraform"
  }
} 
