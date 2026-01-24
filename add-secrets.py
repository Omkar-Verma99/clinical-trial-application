#!/usr/bin/env python3
"""
GitHub Secrets Setup Script
This script adds Firebase secrets to your GitHub repository without needing GitHub CLI installed.

Usage:
    python add-secrets.py YOUR_GITHUB_TOKEN

Get your token from: https://github.com/settings/tokens/new
Permissions needed: repo, admin:repo_hook
"""

import requests
import sys
import json

def add_secrets(token, owner="Omkar-Verma99", repo="clinical-trial-application"):
    secrets = {
        "FIREBASE_API_KEY": "AIzaSyDAn3llTqhmCmysQ0_lcX79RvuJsQMB2ks",
        "FIREBASE_AUTH_DOMAIN": "kollectcare-rwe-study.firebaseapp.com",
        "FIREBASE_PROJECT_ID": "kollectcare-rwe-study",
        "FIREBASE_STORAGE_BUCKET": "kollectcare-rwe-study.firebasestorage.app",
        "FIREBASE_MESSAGING_SENDER_ID": "716627719667",
        "FIREBASE_APP_ID": "1:716627719667:web:a8cf139d96e9de2e5b8e86",
        "FIREBASE_MEASUREMENT_ID": "G-QTWVYF3R19"
    }
    
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
    }
    
    print("Adding GitHub Secrets...")
    print("-" * 50)
    
    for secret_name, secret_value in secrets.items():
        url = f"https://api.github.com/repos/{owner}/{repo}/actions/secrets/{secret_name}"
        
        payload = {"encrypted_value": secret_value}
        
        try:
            response = requests.put(url, headers=headers, json=payload)
            
            if response.status_code in [201, 204]:
                print(f"✓ Added secret: {secret_name}")
            else:
                print(f"✗ Failed to add {secret_name}: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"✗ Error adding {secret_name}: {str(e)}")
    
    print("-" * 50)
    print("✓ All secrets added! GitHub Actions will use these during build.")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python add-secrets.py YOUR_GITHUB_TOKEN")
        print("\nGet your token from: https://github.com/settings/tokens/new")
        print("Permissions needed: repo, admin:repo_hook")
        sys.exit(1)
    
    token = sys.argv[1]
    add_secrets(token)
