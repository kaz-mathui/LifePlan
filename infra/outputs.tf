output "codestar_connection_arn" {
  description = "The ARN of the CodeStar Connection to GitHub"
  value       = aws_codestarconnections_connection.github.arn
}

output "codestar_connection_status" {
  description = "The status of the CodeStar Connection to GitHub"
  value       = aws_codestarconnections_connection.github.connection_status
} 
