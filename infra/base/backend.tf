# terraform {
#   backend "s3" {
#     bucket         = "your-terraform-state-bucket-name" # TODO: 後で設定
#     key            = "lifeplan/base/terraform.tfstate"
#     region         = "ap-northeast-1"
#     encrypt        = true
#     dynamodb_table = "terraform-state-lock" # TODO: 後で設定
#   }
# } 
