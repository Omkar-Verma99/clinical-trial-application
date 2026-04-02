#!/usr/bin/env powershell
<# 
Google Cloud Billing Analysis Script
Uses gcloud CLI to analyze costs by project and service
#>

# Define gcloud path
$gcloud = "C:\Users\Omkar.Verma\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"

# Refresh PATH first
$env:PATH = [System.Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH','User')

Write-Host "╔════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        GOOGLE CLOUD BILLING ANALYSIS - DETAILED PROJECT BREAKDOWN          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if user is authenticated
Write-Host "Step 1️⃣ : Checking Google Cloud authentication..." -ForegroundColor Yellow
$authStatus = &$gcloud auth list --format="value(account)" 2>&1
if ($LASTEXITCODE -ne 0 -or $authStatus -eq $null) {
    Write-Host ""
    Write-Host "❌ NOT AUTHENTICATED! You need to login first." -ForegroundColor Red
    Write-Host ""
    Write-Host "To authenticate, run:" -ForegroundColor Yellow
    Write-Host '  gcloud auth login' -ForegroundColor Green
    Write-Host ""
    Write-Host "Then come back and run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Authenticated as: $authStatus" -ForegroundColor Green
Write-Host ""

# Step 2: List all projects
Write-Host "Step 2️⃣ : Fetching all projects..." -ForegroundColor Yellow
$projects = &$gcloud projects list --format="value(projectId,name)" 2>&1 | ConvertFrom-Csv -Delimiter "`t" -Header "projectId", "name"

if ($projects.Count -eq 0) {
    Write-Host "No projects found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found $($projects.Count) project(s)" -ForegroundColor Green
Write-Host ""

Write-Host "📋 PROJECTS SUMMARY:" -ForegroundColor Cyan
Write-Host "━" * 80
foreach ($proj in $projects) {
    Write-Host "  • $($proj.projectId)" -ForegroundColor White
}
Write-Host "━" * 80
Write-Host ""

# Step 3: Try to get billing info for each project
Write-Host "Step 3️⃣ : Analyzing costs by project..." -ForegroundColor Yellow
Write-Host ""

$billingAccounts = &$gcloud billing accounts list --format="value(name,displayName)" 2>&1

if ($billingAccounts.Count -gt 0) {
    Write-Host "✅ Billing Accounts Found:" -ForegroundColor Green
    Write-Host "━" * 80
    $billingAccounts | ForEach-Object {
        Write-Host "  $_"
    }
    Write-Host "━" * 80
} else {
    Write-Host "⚠️  No billing accounts accessible. You may need billing read permissions." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 4️⃣ : Getting current configuration..." -ForegroundColor Yellow
$config = &$gcloud config list --format="value(core.project)" 2>&1
Write-Host "✅ Current project: $config" -ForegroundColor Green
Write-Host ""

# Step 5: Instructions for detailed analysis
Write-Host "╔════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    HOW TO GET BILLING DATA FROM CLI                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next Steps to see your actual costs:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Export billing data to BigQuery (if available):" -ForegroundColor White
Write-Host "   &`"$gcloud`" billing budgets list --billing-account=YOUR_BILLING_ACCOUNT_ID" -ForegroundColor Green
Write-Host ""
Write-Host "2. View costs in Google Cloud Console:" -ForegroundColor White
Write-Host "   https://console.cloud.google.com/billing/reports" -ForegroundColor Blue
Write-Host ""
Write-Host "3. Export detailed CSV:" -ForegroundColor White
Write-Host "   • Go to Billing > Reports" -ForegroundColor Green
Write-Host "   • Group by SERVICE" -ForegroundColor Green
Write-Host "   • Click Download CSV" -ForegroundColor Green
Write-Host "   • Share CSV with analysis" -ForegroundColor Green
Write-Host ""

Write-Host "╔════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                         ALTERNATIVE: CLI QUERIES                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "Try these commands to dig deeper:" -ForegroundColor Yellow
Write-Host ""
Write-Host "# List all services enabled in projects:" -ForegroundColor Cyan
Write-Host '  for %p in (kollectcare-rwe-study) do (echo === %p === && gcloud services list --project=%p)' -ForegroundColor Green
Write-Host ""
Write-Host "# Check Cloud Run executions:" -ForegroundColor Cyan
Write-Host '  gcloud run services list --project=YOUR_PROJECT' -ForegroundColor Green
Write-Host ""
Write-Host "# Check App Engine versions:" -ForegroundColor Cyan
Write-Host '  gcloud app versions list --project=YOUR_PROJECT' -ForegroundColor Green
Write-Host ""
Write-Host "# Check Firestore size:" -ForegroundColor Cyan
Write-Host '  gcloud firestore databases describe --database=default --project=YOUR_PROJECT' -ForegroundColor Green
Write-Host ""

Write-Host ""
Write-Host "=" * 80 -ForegroundColor Yellow
Write-Host "🎯 SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Yellow
Write-Host ""
Write-Host "Google Cloud SDK is now installed and working! ✅" -ForegroundColor Green
Write-Host ""
Write-Host "However, for detailed BILLING analysis, you need to:" -ForegroundColor Yellow
Write-Host "  1. Export CSV from Google Cloud Console (Billing > Reports > Download CSV)" -ForegroundColor White
Write-Host "  2. Share the CSV file with analysis" -ForegroundColor White
Write-Host ""
Write-Host "The CLI is better for checking SERVICES and RESOURCES." -ForegroundColor Yellow
Write-Host "The Console is better for checking COSTS and TRENDS." -ForegroundColor Yellow
Write-Host ""
Write-Host "=" * 80 -ForegroundColor Yellow
