import os
import json
import boto3
from botocore.exceptions import ClientError

# ---------- Config (env vars override defaults) ----------
TABLE_NAME = os.getenv("TABLE_NAME", "activityLog")
BILLING_MODE = os.getenv("BILLING_MODE", "PROVISIONED")  # or "PAY_PER_REQUEST"
RCU = int(os.getenv("READ_CAPACITY_UNITS", "5"))
WCU = int(os.getenv("WRITE_CAPACITY_UNITS", "5"))
ENABLE_AUTOSCALING = os.getenv("ENABLE_AUTOSCALING", "true").lower() == "true"
WAIT_FOR_ACTIVE = os.getenv("WAIT_FOR_ACTIVE", "false").lower() == "true"

# ---------- Boto3 clients (module scope for Lambda re-use) ----------
dynamodb = boto3.client("dynamodb")
autoscaling = boto3.client("application-autoscaling")

def lambda_handler(event, context):
    """
    Lambda entrypoint.
    Optional event flags:
      - wait (bool): wait for table to become ACTIVE (default: WAIT_FOR_ACTIVE env)
      - autoscaling (bool): enable autoscaling (default: ENABLE_AUTOSCALING env)
    """
    wait = bool(event.get("wait", WAIT_FOR_ACTIVE)) if isinstance(event, dict) else WAIT_FOR_ACTIVE
    do_autoscaling = bool(event.get("autoscaling", ENABLE_AUTOSCALING)) if isinstance(event, dict) else ENABLE_AUTOSCALING

    try:
        created = create_activity_log_table(wait)
        if do_autoscaling and BILLING_MODE.upper() == "PROVISIONED":
            configure_auto_scaling()

        body = {
            "table": TABLE_NAME,
            "created": created,
            "autoscaling_configured": bool(do_autoscaling and BILLING_MODE.upper() == "PROVISIONED")
        }
        return {"statusCode": 200, "body": json.dumps(body, default=str)}

    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}

def create_activity_log_table(wait_for_active: bool):
    """
    Create the DynamoDB table (idempotent). Returns True if created, False if already existed.
    """
    try:
        params = {
            "TableName": TABLE_NAME,
            "KeySchema": [{"AttributeName": "activityId", "KeyType": "HASH"}],
            "AttributeDefinitions": [
                {"AttributeName": "activityId", "AttributeType": "S"},
                {"AttributeName": "userEmail", "AttributeType": "S"},
                {"AttributeName": "timestamp", "AttributeType": "S"},
                {"AttributeName": "actionType", "AttributeType": "S"},
            ],
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "userEmail-timestamp-index",
                    "KeySchema": [
                        {"AttributeName": "userEmail", "KeyType": "HASH"},
                        {"AttributeName": "timestamp", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
                {
                    "IndexName": "actionType-timestamp-index",
                    "KeySchema": [
                        {"AttributeName": "actionType", "KeyType": "HASH"},
                        {"AttributeName": "timestamp", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
            ],
        }

        if BILLING_MODE.upper() == "PROVISIONED":
            params.update({
                "BillingMode": "PROVISIONED",
                "ProvisionedThroughput": {"ReadCapacityUnits": RCU, "WriteCapacityUnits": WCU},
            })
            # Also set throughput for GSIs under PROVISIONED
            for gsi in params["GlobalSecondaryIndexes"]:
                gsi["ProvisionedThroughput"] = {"ReadCapacityUnits": RCU, "WriteCapacityUnits": WCU}
        else:
            params["BillingMode"] = "PAY_PER_REQUEST"

        dynamodb.create_table(**params)
        print(f"Created table '{TABLE_NAME}'.")
        if wait_for_active:
            waiter = dynamodb.get_waiter("table_exists")
            waiter.wait(TableName=TABLE_NAME)
            print(f"Table '{TABLE_NAME}' is ACTIVE.")
        return True

    except dynamodb.exceptions.ResourceInUseException:
        print(f"Table '{TABLE_NAME}' already exists.")
        return False
    except ClientError as e:
        # Bubble up anything unexpected
        print(f"Error creating table: {e}")
        raise

def configure_auto_scaling():
    """
    Enable Application Auto Scaling for the table and GSIs (PROVISIONED only).
    """
    try:
        targets = [
            # Table RCUs/WCUs
            {
                "ServiceNamespace": "dynamodb",
                "ResourceId": f"table/{TABLE_NAME}",
                "ScalableDimension": "dynamodb:table:ReadCapacityUnits",
                "MinCapacity": RCU,
                "MaxCapacity": max(RCU, 100),
            },
            {
                "ServiceNamespace": "dynamodb",
                "ResourceId": f"table/{TABLE_NAME}",
                "ScalableDimension": "dynamodb:table:WriteCapacityUnits",
                "MinCapacity": WCU,
                "MaxCapacity": max(WCU, 100),
            },
            # GSI: userEmail-timestamp-index
            {
                "ServiceNamespace": "dynamodb",
                "ResourceId": f"table/{TABLE_NAME}/index/userEmail-timestamp-index",
                "ScalableDimension": "dynamodb:index:ReadCapacityUnits",
                "MinCapacity": RCU,
                "MaxCapacity": max(RCU, 100),
            },
            {
                "ServiceNamespace": "dynamodb",
                "ResourceId": f"table/{TABLE_NAME}/index/userEmail-timestamp-index",
                "ScalableDimension": "dynamodb:index:WriteCapacityUnits",
                "MinCapacity": WCU,
                "MaxCapacity": max(WCU, 100),
            },
            # GSI: actionType-timestamp-index
            {
                "ServiceNamespace": "dynamodb",
                "ResourceId": f"table/{TABLE_NAME}/index/actionType-timestamp-index",
                "ScalableDimension": "dynamodb:index:ReadCapacityUnits",
                "MinCapacity": RCU,
                "MaxCapacity": max(RCU, 100),
            },
            {
                "ServiceNamespace": "dynamodb",
                "ResourceId": f"table/{TABLE_NAME}/index/actionType-timestamp-index",
                "ScalableDimension": "dynamodb:index:WriteCapacityUnits",
                "MinCapacity": WCU,
                "MaxCapacity": max(WCU, 100),
            },
        ]

        for t in targets:
            try:
                autoscaling.register_scalable_target(**t)
                print(f"Registered scalable target: {t['ResourceId']} - {t['ScalableDimension']}")
            except ClientError as e:
                # Continue configuring others even if one fails
                print(f"Register target failed for {t['ResourceId']} ({t['ScalableDimension']}): {e}")

        # Table-level target tracking policies
        policies = [
            {
                "name": "activityLog-read-scaling-policy",
                "dimension": "dynamodb:table:ReadCapacityUnits",
                "target_value": 70.0,
            },
            {
                "name": "activityLog-write-scaling-policy",
                "dimension": "dynamodb:table:WriteCapacityUnits",
                "target_value": 70.0,
            },
        ]

        for p in policies:
            try:
                metric_type = (
                    "DynamoDBReadCapacityUtilization"
                    if "Read" in p["dimension"]
                    else "DynamoDBWriteCapacityUtilization"
                )
                autoscaling.put_scaling_policy(
                    PolicyName=p["name"],
                    ServiceNamespace="dynamodb",
                    ResourceId=f"table/{TABLE_NAME}",
                    ScalableDimension=p["dimension"],
                    PolicyType="TargetTrackingScaling",
                    TargetTrackingScalingPolicyConfiguration={
                        "TargetValue": p["target_value"],
                        "PredefinedMetricSpecification": {"PredefinedMetricType": metric_type},
                    },
                )
                print(f"Created scaling policy: {p['name']}")
            except ClientError as e:
                print(f"Create policy failed for {p['name']}: {e}")

        print("Auto-scaling configured.")
    except ClientError as e:
        print(f"Auto-scaling configuration error: {e}")
        # Do not raise; table is usable without autoscaling.
