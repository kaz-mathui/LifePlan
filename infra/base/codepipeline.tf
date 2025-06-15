# CodeStar Connection to GitHub
resource "aws_codestarconnections_connection" "github" {
  provider_type = "GitHub"
  name          = "github-connection"
} 
