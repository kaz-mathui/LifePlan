variable "aws_region" {
  description = "The AWS region to deploy resources."
  type        = string
  default     = "ap-northeast-1"
}

variable "domain_name" {
  description = "The domain name for the application."
  type        = string
  # この値は実際のドメイン名に合わせて設定する必要がある
  # 例: "example.com"
  # terraform.tfvars やコマンドライン引数で渡すことを想定
}

variable "subdomain_name" {
  description = "The subdomain name for the ALB."
  type        = string
  default     = "app" # 例: app.example.com
}

variable "dockerhub_username" {
  description = "The username for Docker Hub."
  type        = string
} 
 