# 注意:
# 最初にAWSコンソールでドメインを登録すると、ホストゾーンが自動で作成されます。
# その後、Terraformでそのホストゾーンを管理下に置くために「インポート」作業が必要です。
#
# 1. AWS Route 53コンソールで、作成されたホストゾーンのIDをコピーします。(例: Z0123456789ABCDEFGHIJ)
# 2. `infra/base` ディレクトリで、以下のコマンドを実行します。
#    terraform import 'aws_route53_zone.main' <あなたのホストゾーンID>

resource "aws_route53_zone" "main" {
  name = var.domain_name
} 
