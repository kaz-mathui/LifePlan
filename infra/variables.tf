variable "aws_region" {
  description = "The AWS region to deploy resources."
  type        = string
  default     = "ap-northeast-1"
}

variable "create_alb" {
  description = "Whether to create the Application Load Balancer and related resources. Set to false to destroy them and save costs."
  type        = bool
  default     = true
} 
