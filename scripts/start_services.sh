#!/bin/bash
# ALBと関連リソースを作成・起動するスクリプト

# スクリプトが設置されているディレクトリを取得
SCRIPT_DIR=$(cd $(dirname $0); pwd)
# プロジェクトのルートディレクトリに移動 (スクリプトの親ディレクトリ)
cd $SCRIPT_DIR/..

# --- 設定 ---
INFRA_ALB_DIR="infra/alb"

# --- スクリプト本文 ---
set -e # エラーが発生したらスクリプトを終了

echo "Applying base infrastructure (if not already done)..."
# (初回以降は差分がないので時間はかからない)
cd infra/base
terraform init
terraform apply -auto-approve
cd ../..

echo "Creating Application Load Balancer and starting services..."

if [ ! -d "$INFRA_ALB_DIR" ]; then
  echo "Error: '$INFRA_ALB_DIR' directory not found."
  exit 1
fi

cd $INFRA_ALB_DIR

# 必要な変数を環境変数やtfvarsファイルから読み込むことを想定
# 例: terraform apply -var="domain_name=yourdomain.com"
terraform init
terraform apply -auto-approve

cd ../..

echo ""
echo "Start process complete. ALB and services are being deployed."
echo "It may take a few minutes for the services to become healthy and accessible via the domain." 
 