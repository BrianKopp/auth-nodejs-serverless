
resource "aws_iam_role" "lambda" {
    name = var.name
    assume_role_policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [{
        "Action": "sts:AssumeRole",
        "Principal": {
            "Service": "lambda.amazonaws.com"
        },
        "Effect": "Allow",
        "Sid": ""
    }]
}
EOF
    tags = var.tags
}

resource "aws_iam_role_policy" "lambda" {
    name = var.name
    role = aws_iam_role.lambda.id
    description = "grants basic lambda access and dynamo access"
# TODO dont use star
    policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [{
        "Action": [
            "dynamodb:GetItem",
            "dynamodb:PutItem",
            "dynamodb:DeleteItem"
        ],
        "Resource": "*",
        "Effect": "Allow"
    }]
}
EOF
}