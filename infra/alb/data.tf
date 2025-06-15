# Data sources to fetch outputs from the base layer
data "terraform_remote_state" "base" {
  backend = "local"

  config = {
    path = "../base/terraform.tfstate"
  }
} 
