#!/usr/bin/env python3
"""
Load AWS credentials from file and run comparison
"""

import os
import sys

# Read credentials from file
if os.path.exists('aws-credentials.txt'):
    print("Loading AWS credentials from aws-credentials.txt...")
    with open('aws-credentials.txt', 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value
                if 'SECRET' not in key:
                    print(f"  Set {key}")
    print()
else:
    print("Error: aws-credentials.txt not found!")
    print("Please create aws-credentials.txt with your AWS credentials.")
    sys.exit(1)

# Import and run the comparison
with open('compare-lambda-code.py', 'r', encoding='utf-8') as f:
    exec(f.read())
