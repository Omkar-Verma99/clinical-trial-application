# Automated Workload Identity Federation Setup

$ProjectId = "kollectcare-rwe-study"
$ProjectNumber = "716627719667"
$GithubRepo = "Omkar-Verma99/clinical-trial-application"
$GithubRepoOwner = "Omkar-Verma99"

Write-Host "=== Workload Identity Federation Setup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Set gcloud project
Write-Host "Setting gcloud project to: $ProjectId" -ForegroundColor Cyan
gcloud config set project $ProjectId

# Step 2: Enable required APIs
Write-Host ""
Write-Host "Enabling required Google Cloud APIs..." -ForegroundColor Cyan
gcloud services enable iamcredentials.googleapis.com --quiet
gcloud services enable sts.googleapis.com --quiet
gcloud services enable serviceusage.googleapis.com --quiet

# Step 3: Create Workload Identity Pool
Write-Host ""
Write-Host "Creating Workload Identity Pool..." -ForegroundColor Cyan
$PoolId = "github-pool"

try {
    gcloud iam workload-identity-pools create $PoolId `
        --project=$ProjectId `
        --location=global `
        --display-name="GitHub Actions Pool" 2>$null
} catch {
    Write-Host "Pool already exists (that's okay)" -ForegroundColor Yellow
}

$PoolResourceName = "projects/$ProjectNumber/locations/global/workloadIdentityPools/$PoolId"

# Step 4: Create OIDC Provider
Write-Host ""
Write-Host "Creating OIDC Provider for GitHub..." -ForegroundColor Cyan
$ProviderId = "github-provider"

try {
    gcloud iam workload-identity-pools providers create-oidc $ProviderId `
        --project=$ProjectId `
        --location=global `
        --workload-identity-pool=$PoolId `
        --display-name="GitHub Provider" `
        --attribute-mapping="google.subject=assertion.sub,assertion.aud=assertion.aud,assertion.repository_owner=assertion.repository_owner" `
        --issuer-uri="https://token.actions.githubusercontent.com" `
        --attribute-condition="assertion.aud == 'sts.googleapis.com'" 2>$null
} catch {
    Write-Host "Provider already exists (that's okay)" -ForegroundColor Yellow
}

# Step 5: Create Service Account
Write-Host ""
Write-Host "Creating Service Account..." -ForegroundColor Cyan
$ServiceAccountId = "github-actions-sa"

try {
    gcloud iam service-accounts create $ServiceAccountId `
        --project=$ProjectId `
        --display-name="GitHub Actions" 2>$null
} catch {
    Write-Host "Service account already exists (that's okay)" -ForegroundColor Yellow
}

$ServiceAccountEmail = "$ServiceAccountId@$ProjectId.iam.gserviceaccount.com"

# Step 6: Grant Firebase Admin permissions
Write-Host ""
Write-Host "Granting Firebase Admin permissions..." -ForegroundColor Cyan
try {
    gcloud projects add-iam-policy-binding $ProjectId `
        --member="serviceAccount:$ServiceAccountEmail" `
        --role="roles/firebase.admin" `
        --condition=None `
        --quiet 2>$null
} catch {
    Write-Host "Permission already exists (that's okay)" -ForegroundColor Yellow
}

# Step 7: Create Workload Identity Binding
Write-Host ""
Write-Host "Creating Workload Identity Binding..." -ForegroundColor Cyan
$ProviderResourceName = "$PoolResourceName/providers/$ProviderId"

try {
    gcloud iam service-accounts add-iam-policy-binding $ServiceAccountEmail `
        --project=$ProjectId `
        --role="roles/iam.workloadIdentityUser" `
        --member="principalSet://iam.googleapis.com/$ProviderResourceName/attribute.repository_owner/$GithubRepoOwner" `
        --quiet 2>$null
} catch {
    Write-Host "Binding already exists (that's okay)" -ForegroundColor Yellow
}

# Step 8: Display results
Write-Host ""
Write-Host "=== CONFIGURATION COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "GitHub Secrets to Add:" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Secret 1: WIF_PROVIDER" -ForegroundColor White
Write-Host "Value:" -ForegroundColor Cyan
Write-Host $ProviderResourceName -ForegroundColor Green
Write-Host ""
Write-Host "Secret 2: WIF_SERVICE_ACCOUNT" -ForegroundColor White
Write-Host "Value:" -ForegroundColor Cyan
Write-Host $ServiceAccountEmail -ForegroundColor Green
Write-Host ""

# Save to file
$Config = @"
# Workload Identity Federation Configuration
# Generated on $(Get-Date)

WIF_PROVIDER=$ProviderResourceName
WIF_SERVICE_ACCOUNT=$ServiceAccountEmail
GITHUB_REPOSITORY=$GithubRepo
GCP_PROJECT_ID=$ProjectId
GCP_PROJECT_NUMBER=$ProjectNumber
"@

$Config | Out-File -FilePath ".env.wif" -Encoding UTF8 -Force
Write-Host "Configuration saved to: .env.wif" -ForegroundColor Green
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open https://github.com/$GithubRepo/settings/secrets/actions" -ForegroundColor Cyan
Write-Host "2. Click 'New repository secret'" -ForegroundColor Cyan
Write-Host "3. Add WIF_PROVIDER secret with the value above" -ForegroundColor Cyan
Write-Host "4. Add WIF_SERVICE_ACCOUNT secret with the value above" -ForegroundColor Cyan
Write-Host "5. Commit and push to trigger deployment" -ForegroundColor Cyan
Write-Host ""
Write-Host "Setup complete! GitHub Actions will now use keyless authentication." -ForegroundColor Green
