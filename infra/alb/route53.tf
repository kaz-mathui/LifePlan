# baseレイヤーで管理されているホストゾーンを参照します。
# data "aws_route53_zone" "selected" {
#   name         = var.domain_name
#   private_zone = false
# }

resource "aws_route53_record" "app" {
  zone_id = data.terraform_remote_state.base.outputs.route53_zone_id
  name    = "${var.subdomain_name}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
} 
