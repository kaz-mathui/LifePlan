#!/bin/bash
# ECSサービスを停止するスクリプト

CLUSTER_NAME="lifeplan-cluster"
FRONTEND_SERVICE_NAME="lifeplan-frontend-service"
BACKEND_SERVICE_NAME="lifeplan-backend-service"

echo "Stopping frontend service..."
aws ecs update-service --cluster $CLUSTER_NAME --service $FRONTEND_SERVICE_NAME --desired-count 0

echo "Stopping backend service..."
aws ecs update-service --cluster $CLUSTER_NAME --service $BACKEND_SERVICE_NAME --desired-count 0

echo "Done." 
