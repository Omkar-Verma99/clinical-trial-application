# ====================================================================
# Setup Workload Identity Federation for GitHub Actions
# ====================================================================
# This script automates the setup of Workload Identity Federation (WIF)
# to replace the deprecated FIREBASE_TOKEN authentication method.
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Firebase project configured
# - GitHub repository credentials
#
# Usage: .\setup-workload-identity.ps1

# Color output for better readability
function Write-Success {
    Write-Host $args -ForegroundColor Green
}

function Write-Info {
    Write-Host $args -ForegroundColor Cyan
}

function Write-Error {
    Write-Host $args -ForegroundColor Red
}

Write-Info "=== Workload Identity Federation Setup ==="
Write-Info ""

# Step 1: Get user input
Write-Info "Enter your Google Cloud Project ID:"
$ProjectId = Read-Host

Write-Info "Enter your Google Cloud Project Number:"
$ProjectNumber = Read-Host

Write-Info "Enter your GitHub Repository (format: owner/repo):"
$GithubRepo = Read-Host

Write-Info "Enter your GitHub Repository Owner:"
$GithubRepoOwner = Read-Host

# Step 2: Set gcloud project
Write-Info ""
Write-Info "Setting gcloud project to: $ProjectId"
gcloud config set project $ProjectId

# Step 3: Enable required APIs
Write-Info ""
Write-Info "Enabling required Google Cloud APIs..."
gcloud services enable iamcredentials.googleapis.com --quiet
gcloud services enable sts.googleapis.com --quiet
gcloud services enable serviceusage.googleapis.com --quiet

# Step 4: Create Workload Identity Pool
Write-Info ""
Write-Info "Creating Workload Identity Pool..."
$PoolId = "github-pool"
$PoolDisplayName = "GitHub Actions Pool"

gcloud iam workload-identity-pools create $PoolId `
    --project=$ProjectId `
    --location=global `
    --display-name=$PoolDisplayName `
    2>$null

# Get the pool resource name
$PoolResourceName = "projects/$ProjectNumber/locations/global/workloadIdentityPools/$PoolId"

# Step 5: Create OIDC Provider
Write-Info ""
Write-Info "Creating OIDC Provider for GitHub..."
$ProviderId = "github-provider"
$ProviderDisplayName = "GitHub Provider"

gcloud iam workload-identity-pools providers create-oidc $ProviderId `
    --project=$ProjectId `
    --location=global `
    --workload-identity-pool=$PoolId `
    --display-name=$ProviderDisplayName `
    --attribute-mapping="google.subject=assertion.sub,assertion.aud=assertion.aud,assertion.repository=$GithubRepoOwner/repo_name,assertion.repository_owner=$GithubRepoOwner" `
    --issuer-uri="https://token.actions.githubusercontent.com" `
    --attribute-condition="assertion.aud == 'sts.googleapis.com'" `
    2>$null

# Step 6: Create Service Account
Write-Info ""
Write-Info "Creating Service Account..."
$ServiceAccountId = "github-actions-sa"
$ServiceAccountName = "GitHub Actions"

gcloud iam service-accounts create $ServiceAccountId `
    --project=$ProjectId `
    --display-name=$ServiceAccountName `
    2>$null

$ServiceAccountEmail = "$ServiceAccountId@$ProjectId.iam.gserviceaccount.com"

# Step 7: Grant permissions to Service Account
Write-Info ""
Write-Info "Granting permissions to Service Account..."
gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$ServiceAccountEmail" `
    --role="roles/firebase.admin" `
    --quiet

# Step 8: Create Workload Identity Binding
Write-Info ""
Write-Info "Creating Workload Identity Binding..."
$ProviderResourceName = "$PoolResourceName/providers/$ProviderId"

gcloud iam service-accounts add-iam-policy-binding $ServiceAccountEmail `
    --project=$ProjectId `
    --role="roles/iam.workloadIdentityUser" `
    --member="principalSet://iam.googleapis.com/$ProviderResourceName/attribute.repository_owner/$GithubRepoOwner" `
    --quiet

# Step 9: Get configuration values
Write-Info ""
Write-Info "=== Configuration Complete ==="
Write-Info ""
Write-Info "GitHub Secrets to add:"
Write-Info "========================"
Write-Success "WIF_PROVIDER: $ProviderResourceName"
Write-Success "WIF_SERVICE_ACCOUNT: $ServiceAccountEmail"
Write-Info ""

# Step 10: Create .env file with configuration
$EnvContent = @"
# Workload Identity Federation Configuration
WIF_PROVIDER=projects/$ProjectNumber/locations/global/workloadIdentityPools/$PoolId/providers/$ProviderId
WIF_SERVICE_ACCOUNT=$ServiceAccountEmail
GITHUB_REPOSITORY=$GithubRepo
GCP_PROJECT_ID=$ProjectId
GCP_PROJECT_NUMBER=$ProjectNumber
"@

$EnvContent | Out-File -FilePath ".env.wif" -Encoding UTF8
Write-Success "Configuration saved to .env.wif"

Write-Info ""
Write-Info "Next steps:"
Write-Info "1. Go to GitHub repository settings -> Secrets and variables -> Actions"
Write-Info "2. Create two new secrets:"
Write-Info "   - Name: WIF_PROVIDER"
Write-Info "     Value: $ProviderResourceName"
Write-Info "   - Name: WIF_SERVICE_ACCOUNT"
Write-Info "     Value: $ServiceAccountEmail"
Write-Info "3. Push changes to main branch to trigger deployment"
Write-Info ""
Write-Success "Setup complete!"
