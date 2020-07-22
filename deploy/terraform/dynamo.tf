
resource "aws_dynamodb_table" "table" {
    name = "${var.environment}-${var.name}"
    billing_mode = "PAY_PER_REQUEST"
    hash_key = "id"
    attribute {
        name = "id"
        type = "S"
    }
    attribute {
        name = "dynamottl"
        type = "N"
    }
    ttl {
        enabled = true
        attribute_name = "dynamottl"
    }
    tags = var.tags
}