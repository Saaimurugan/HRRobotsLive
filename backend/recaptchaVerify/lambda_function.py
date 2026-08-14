"""
recaptchaVerify Lambda

A shared Lambda that verifies reCAPTCHA v3 tokens on behalf of any other Lambda.

Invoked synchronously (RequestResponse) by other Lambdas via:
    boto3.client('lambda').invoke(
        FunctionName='recaptchaVerify',
        InvocationType='RequestResponse',
        Payload=json.dumps({ "token": "...", "action": "login" })
    )

Returns:
    { "valid": true }   — token passed
    { "valid": false, "reason": "..." }  — token failed
"""

import json
import os
import urllib.request
import urllib.parse

RECAPTCHA_SECRET = os.environ.get("RECAPTCHA_SECRET_KEY", "")
MIN_SCORE = float(os.environ.get("RECAPTCHA_MIN_SCORE", "0.5"))


def lambda_handler(event, context):
    token  = event.get("token", "")
    action = event.get("action", None)

    # Secret key not configured — warn but pass through so a missing env var
    # doesn't silently lock out all users on first deploy.
    if not RECAPTCHA_SECRET:
        print("WARNING: RECAPTCHA_SECRET_KEY env var not set")
        return {"valid": True, "reason": "secret_not_configured"}

    if not token:
        return {"valid": False, "reason": "token_missing"}

    try:
        data = urllib.parse.urlencode({
            "secret":   RECAPTCHA_SECRET,
            "response": token,
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://www.google.com/recaptcha/api/siteverify",
            data=data,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        print(f"reCAPTCHA result: {result}")

        if not result.get("success"):
            return {"valid": False, "reason": f"google_rejected: {result.get('error-codes', [])}"}

        score = result.get("score", 0.0)
        if score < MIN_SCORE:
            return {"valid": False, "reason": f"score_too_low: {score}"}

        if action and result.get("action") != action:
            return {"valid": False, "reason": f"action_mismatch: expected={action} got={result.get('action')}"}

        return {"valid": True}

    except Exception as e:
        # Fail open on network errors — a Google outage should not lock users out
        print(f"reCAPTCHA Lambda error: {e}")
        return {"valid": True, "reason": f"network_error_fail_open: {str(e)}"}
