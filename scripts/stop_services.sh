#!/bin/bash
# ECSサービスを停止し、コスト削減のためにALBを削除するスクリプト

# スクリプトが設置されているディレクトリを取得
SCRIPT_DIR=$(cd $(dirname $0); pwd)
# プロジェクトのルートディレクトリに移動 (スクリプトの親ディレクトリ)
cd $SCRIPT_DIR/..

# --- 設定 ---
CLUSTER_NAME="lifeplan-cluster"
FRONTEND_SERVICE_NAME="lifeplan-frontend-service"
BACKEND_SERVICE_NAME="lifeplan-backend-service"
INFRA_DIR="infra"

# --- スクリプト本文 ---
set -e # エラーが発生したらスクリプトを終了

echo "Stopping ECS services..."
aws ecs update-service --cluster $CLUSTER_NAME --service $FRONTEND_SERVICE_NAME --desired-count 0 > /dev/null
aws ecs update-service --cluster $CLUSTER_NAME --service $BACKEND_SERVICE_NAME --desired-count 0 > /dev/null
echo "ECS services desired count set to 0."

echo ""
echo "Destroying Application Load Balancer to save costs..."

if [ ! -d "$INFRA_DIR" ]; then
  echo "Error: '$INFRA_DIR' directory not found. Please run this script from the project root."
  exit 1
fi

cd $INFRA_DIR

# ALBを削除するために変数をfalseに設定してapplyを実行
terraform apply -var="create_alb=false" -auto-approve

cd ..

echo ""
echo "Stop process complete. ECS services are scaled down and ALB has been destroyed." 
 