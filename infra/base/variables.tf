variable "aws_region" {
  description = "The AWS region to deploy resources."
  type        = string
  default     = "ap-northeast-1"
}

variable "domain_name" {
  description = "The domain name you have registered (e.g., example.com)."
  type        = string
}

variable "create_alb" {
  description = "Whether to create the Application Load Balancer and related resources. Set to false to destroy them and save costs."
  type        = bool
  default     = true
} 
