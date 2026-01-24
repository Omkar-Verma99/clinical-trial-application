# GitHub Secrets Setup Script
# Instructions: 
# 1. Get your GitHub Personal Access Token from https://github.com/settings/tokens
#    (Create with 'repo' and 'admin:repo_hook' permissions)
# 2. Run: .\add-secrets.ps1 -Token "your_token_here"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$owner = "Omkar-Verma99"
$repo = "clinical-trial-application"

$secrets = @{
    "FIREBASE_API_KEY" = "AIzaSyDAn3llTqhmCmysQ0_lcX79RvuJsQMB2ks"
    "FIREBASE_AUTH_DOMAIN" = "kollectcare-rwe-study.firebaseapp.com"
    "FIREBASE_PROJECT_ID" = "kollectcare-rwe-study"
    "FIREBASE_STORAGE_BUCKET" = "kollectcare-rwe-study.firebasestorage.app"
    "FIREBASE_MESSAGING_SENDER_ID" = "716627719667"
    "FIREBASE_APP_ID" = "1:716627719667:web:a8cf139d96e9de2e5b8e86"
    "FIREBASE_MEASUREMENT_ID" = "G-QTWVYF3R19"
}

$headers = @{
    "Authorization" = "token $Token"
    "Accept" = "application/vnd.github.v3+json"
}

# Get the public key for encryption
Write-Host "Getting repository public key..." -ForegroundColor Cyan
$keyUrl = "https://api.github.com/repos/$owner/$repo/actions/secrets/public-key"
$keyResponse = Invoke-RestMethod -Uri $keyUrl -Method GET -Headers $headers
$publicKey = $keyResponse.key
$keyId = $keyResponse.key_id

Write-Host "Public key obtained. Key ID: $keyId" -ForegroundColor Green
Write-Host "Adding GitHub Secrets..." -ForegroundColor Green

foreach ($secretName in $secrets.Keys) {
    $secretValue = $secrets[$secretName]
    
    # Base64 encode the secret value
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($secretValue)
    $encodedValue = [System.Convert]::ToBase64String($bytes)
    
    $body = @{
        "encrypted_value" = $encodedValue
        "key_id" = $keyId
    } | ConvertTo-Json
    
    $url = "https://api.github.com/repos/$owner/$repo/actions/secrets/$secretName"
    
    try {
        Invoke-RestMethod -Uri $url -Method PUT -Headers $headers -Body $body -ContentType "application/json"
        Write-Host "Added secret: $secretName" -ForegroundColor Green
    } 
    catch {
        Write-Host "Failed to add $secretName : $_" -ForegroundColor Red
    }
}

Write-Host "All secrets added! GitHub Actions will now use these values during build." -ForegroundColor Green
