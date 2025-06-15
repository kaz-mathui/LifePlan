locals {
  # フロントエンドコンテナが必要とするシークレットのキー一覧
  frontend_secret_keys = toset([
    "REACT_APP_FIREBASE_API_KEY",
    "REACT_APP_FIREBASE_AUTH_DOMAIN",
    "REACT_APP_FIREBASE_PROJECT_ID",
    "REACT_APP_FIREBASE_STORAGE_BUCKET",
    "REACT_APP_FIREBASE_MESSAGING_SENDER_ID",
    "REACT_APP_FIREBASE_APP_ID",
    "REACT_APP_FIREBASE_MEASUREMENT_ID",
  ])

  # バックエンドコンテナが必要とするシークレットのキー
  backend_secret_key = "SERVICE_ACCOUNT_KEY"
}

# AWS Secrets Managerに既に存在しているアプリケーション用の単一シークレットを読み込む
data "aws_secretsmanager_secret" "app_secrets" {
  name = "prd/life-plan-app/firebase"
}
