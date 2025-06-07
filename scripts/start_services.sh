#!/bin/bash
# ECSサービスを起動するスクリプト

CLUSTER_NAME="lifeplan-cluster"
FRONTEND_SERVICE_NAME="lifeplan-frontend-service"
BACKEND_SERVICE_NAME="lifeplan-backend-service"

echo "Starting frontend service..."
aws ecs update-service --cluster $CLUSTER_NAME --service $FRONTEND_SERVICE_NAME --desired-count 1

echo "Starting backend service..."
aws ecs update-service --cluster $CLUSTER_NAME --service $BACKEND_SERVICE_NAME --desired-count 1

echo "Done. It may take a few minutes for the tasks to be fully running." 
