#!/bin/bash
# ALBを作成し、ECSサービスを起動するスクリプト

# --- 設定 ---
CLUSTER_NAME="lifeplan-cluster"
FRONTEND_SERVICE_NAME="lifeplan-frontend-service"
BACKEND_SERVICE_NAME="lifeplan-backend-service"
INFRA_DIR="infra"

# --- スクリプト本文 ---
set -e # エラーが発生したらスクリプトを終了

echo "Creating Application Load Balancer..."

if [ ! -d "$INFRA_DIR" ]; then
  echo "Error: '$INFRA_DIR' directory not found. Please run this script from the project root."
  exit 1
fi

cd $INFRA_DIR

# ALBを作成するために変数をtrueに設定してapplyを実行
terraform apply -var="create_alb=true" -auto-approve

cd ..

echo ""
echo "ALB is ready. Starting ECS services..."

aws ecs update-service --cluster $CLUSTER_NAME --service $FRONTEND_SERVICE_NAME --desired-count 1 > /dev/null
aws ecs update-service --cluster $CLUSTER_NAME --service $BACKEND_SERVICE_NAME --desired-count 1 > /dev/null

echo "ECS services desired count set to 1."
echo ""
echo "Start process complete. It may take a few minutes for the services to become healthy and accessible via the ALB." 
