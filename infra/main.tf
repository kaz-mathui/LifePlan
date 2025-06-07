terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  /*
  backend "s3" {
    # この部分は後でS3バケットを作成した後に設定します。
    # Terraformの状態をチームで共有するために必要です。
    # bucket         = "your-terraform-state-bucket-name" # TODO: 後で設定
    # key            = "lifeplan/terraform.tfstate"
    # region         = "ap-northeast-1"
    # encrypt        = true
    # dynamodb_table = "terraform-state-lock" # TODO: 後で設定
  }
  */
}

provider "aws" {
  region = "ap-northeast-1" # 東京リージョンを使用
} 
