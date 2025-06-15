terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-1"
}

/*
data "terraform_remote_state" "base" {
  backend = "local"

  config = {
    path = "../base/terraform.tfstate"
  }
}
*/

locals {
  prefix = "lifeplan"
  tags = {
    Project = "LifePlan"
    ManagedBy = "Terraform"
  }
} 
