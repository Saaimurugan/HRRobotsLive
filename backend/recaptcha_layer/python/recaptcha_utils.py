"""
recaptcha_utils.py  — shared helper used by all Lambdas.

Calls the centralised 'recaptchaVerify' Lambda instead of hitting
Google's API directly. This means:
  - RECAPTCHA_SECRET_KEY lives ONLY in recaptchaVerify
  - All other Lambdas just import this file and call verify_recaptcha()

Usage:
    from recaptcha_utils import verify_recaptcha

    ok, err = verify_recaptcha(body.get("recaptchaToken", ""), action="login")
    if not ok:
        return err          # returns a 403 HTTP response dict
"""

import json
import os
import boto3

# Name of the centralised verification Lambda.
# Override via env var if you deploy to a different name/alias.
VERIFY_FUNCTION_NAME = os.environ.get("RECAPTCHA_VERIFY_FUNCTION", "recaptchaVerify")

_lambda_client = None


def _get_client():
    global _lambda_client
    if _lambda_client is None:
        _lambda_client = boto3.client("lambda")
    return _lambda_client


def verify_recaptcha(token: str, action: str = None) -> tuple:
    """
    Verify a reCAPTCHA v3 token by invoking the shared recaptchaVerify Lambda.

    Returns:
        (True,  None)             — token is valid, proceed normally
        (False, error_response)   — token invalid, return error_response to caller
    """
    if not token:
        return False, recaptcha_error_response("reCAPTCHA token is missing.")

    try:
        response = _get_client().invoke(
            FunctionName=VERIFY_FUNCTION_NAME,
            InvocationType="RequestResponse",
            Payload=json.dumps({"token": token, "action": action}),
        )
        result = json.loads(response["Payload"].read())
        print(f"recaptchaVerify response: {result}")

        if result.get("valid"):
            return True, None
        else:
            reason = result.get("reason", "unknown")
            print(f"reCAPTCHA rejected: {reason}")
            return False, recaptcha_error_response("Request blocked: reCAPTCHA verification failed.")

    except Exception as e:
        # Fail open — if the verify Lambda itself errors, don't block the user
        print(f"recaptchaVerify invoke error: {e}")
        return True, None


def recaptcha_error_response(message: str = "reCAPTCHA verification failed.") -> dict:
    """Standard 403 Lambda HTTP response for reCAPTCHA failures."""
    return {
        "statusCode": 403,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"message": message}),
    }
