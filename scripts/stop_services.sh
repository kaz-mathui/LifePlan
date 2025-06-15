#!/bin/bash
# ALBと関連リソースを破棄するスクリプト

# スクリプトが設置されているディレクトリを取得
SCRIPT_DIR=$(cd $(dirname $0); pwd)
# プロジェクトのルートディレクトリに移動 (スクリプトの親ディレクトリ)
cd $SCRIPT_DIR/..

# --- 設定 ---
INFRA_ALB_DIR="infra/alb"

# --- スクリプト本文 ---
set -e # エラーが発生したらスクリプトを終了

echo "Destroying Application Load Balancer and related resources..."

if [ ! -d "$INFRA_ALB_DIR" ]; then
  echo "Error: '$INFRA_ALB_DIR' directory not found."
  exit 1
fi

cd $INFRA_ALB_DIR

# 必要な変数を環境変数やtfvarsファイルから読み込むことを想定
# 例: terraform destroy -var="domain_name=yourdomain.com"
terraform init
terraform destroy -auto-approve

cd ../..

echo ""
echo "Stop process complete. ALB and related resources have been destroyed." 
 