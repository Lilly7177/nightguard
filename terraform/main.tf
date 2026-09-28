terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = "eu-north-1"
}


# -------------------------------------------------------
# VARIABLES
# -------------------------------------------------------

variable "db_host" {
  type      = string
  sensitive = true
}

variable "db_port" {
  type = string
}

variable "db_user" {
  type      = string
  sensitive = true
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_name" {
  type = string
}

variable "nightguard_email" {
  type = string
}

variable "nightguard_app_password" {
  type      = string
  sensitive = true
}

variable "openrouteservice_api_key" {
  type      = string
  sensitive = true
}


# -------------------------------------------------------
# ECR REPOSITORY
# -------------------------------------------------------

resource "aws_ecr_repository" "nightguard_backend" {
  name                 = "nightguard-backend"
  image_tag_mutability = "MUTABLE"

  encryption_configuration {
    encryption_type = "AES256"
  }
}


# -------------------------------------------------------
# ECS CLUSTER
# -------------------------------------------------------

resource "aws_ecs_cluster" "nightguard" {
  name = "nightguard-cluster"

  configuration {
    execute_command_configuration {
      logging = "DEFAULT"
    }
  }
}


# -------------------------------------------------------
# ECS TASK DEFINITION
# -------------------------------------------------------

resource "aws_ecs_task_definition" "nightguard_backend" {
  family                   = "nightguard-backend-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]

  cpu    = "512"
  memory = "1024"

  execution_role_arn = "arn:aws:iam::280655608487:role/ecsTaskExecutionRole"

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([
    {
      name      = "nightguard-backend"
      image     = "280655608487.dkr.ecr.eu-north-1.amazonaws.com/nightguard-backend@sha256:a50473fd5ac4b7ad98c5a5873aa3c92a29eb7956f4f87aae5de62e73048a0f10"
      essential = true

      portMappings = [
        {
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
          name          = "nightguard-backend-8000-tcp"
          appProtocol   = "http"
        }
      ]

      environment = [
        {
          name  = "DB_HOST"
          value = var.db_host
        },
        {
          name  = "DB_PORT"
          value = var.db_port
        },
        {
          name  = "DB_USER"
          value = var.db_user
        },
        {
          name  = "DB_PASSWORD"
          value = var.db_password
        },
        {
          name  = "DB_NAME"
          value = var.db_name
        },
        {
          name  = "NIGHTGUARD_EMAIL"
          value = var.nightguard_email
        },
        {
          name  = "NIGHTGUARD_EMAIL_APP_PASSWORD"
          value = var.nightguard_app_password
        },
        {
          name  = "OPENROUTESERVICE_API_KEY"
          value = var.openrouteservice_api_key
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"

        options = {
          "awslogs-group"         = "/ecs/nightguard-backend-task"
          "awslogs-create-group"  = "true"
          "awslogs-region"        = "eu-north-1"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}


# -------------------------------------------------------
# ECS SERVICE
# -------------------------------------------------------

resource "aws_ecs_service" "nightguard_backend" {
  name    = "nightguard-backend-service"
  cluster = aws_ecs_cluster.nightguard.id

  task_definition = aws_ecs_task_definition.nightguard_backend.arn
  desired_count   = 1

  platform_version = "LATEST"

  enable_ecs_managed_tags = true

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 0
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets = [
      "subnet-0c61974205b13e824",
      "subnet-0da9abd65ba705202",
      "subnet-0f07f381b6b2c6dcc"
    ]

    security_groups = [
      "sg-07e7585f0ad4cddb7"
    ]

    assign_public_ip = true
  }
}