#!/usr/bin/env powershell

# Google Cloud Project Analysis Script
# Analyzes all projects to identify services and costs

$gcloud = "C:\Users\Omkar.Verma\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud"

Write-Host "`n" -ForegroundColor White
Write-Host "╔════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              ANALYZING ALL GOOGLE CLOUD PROJECTS & SERVICES               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$projects = @(
    "gifted-fragment-482706-h7",
    "interakt-log-queue",
    "kollectcare-event-bcc1a",
    "kollectcare-rwe-study",
    "studio-5225388595-68162"
)

foreach ($project in $projects) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host "📌 PROJECT: $project" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host ""
    
    # Check enabled services
    Write-Host "🔧 Enabled Services:" -ForegroundColor Green
    Write-Host ""
    $services = & $gcloud services list --project=$project --enabled --format="table(name)" 2>&1
    
    if ($services) {
        $services | Select-Object -Skip 0 | ForEach-Object {
            if ($_ -match "^\S") {
                Write-Host "   ✓ $_" -ForegroundColor White
            }
        }
    } else {
        Write-Host "   (No services enabled or unable to read)" -ForegroundColor Gray
    }
    
    Write-Host ""
    
    # Check App Engine
    Write-Host "⚙️  App Engine Status:" -ForegroundColor Green
    $appEngine = & $gcloud app describe --project=$project 2>&1
    if ($appEngine -match "ERROR") {
        Write-Host "   ✗ Not deployed" -ForegroundColor Gray
    } else {
        Write-Host $appEngine | Select-Object -First 10 | ForEach-Object { Write-Host "   $_" }
    }
    
    Write-Host ""
    
    # Check Cloud Run
    Write-Host "☁️  Cloud Run Services:" -ForegroundColor Green
    $cloudRun = & $gcloud run services list --project=$project --format="table(name,url)" 2>&1
    if ($cloudRun -match "ERROR" -or $cloudRun -match "^Listed" -or $cloudRun.Count -lt 2) {
        Write-Host "   (No Cloud Run services)" -ForegroundColor Gray
    } else {
        $cloudRun | ForEach-Object { Write-Host "   $_" }
    }
    
    Write-Host ""
    
    # Check Firestore
    Write-Host "📊 Firestore:" -ForegroundColor Green
    $firestore = & $gcloud firestore databases describe --database=default --project=$project 2>&1
    if ($firestore -match "ERROR") {
        Write-Host "   (No Firestore database)" -ForegroundColor Gray
    } else {
        Write-Host $firestore | Select-Object -First 5 | ForEach-Object { Write-Host "   $_" }
    }
    
    Write-Host ""
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "📌 BILLING INFORMATION" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

Write-Host "Billing Accounts:" -ForegroundColor Green
$billing = & $gcloud billing accounts list 2>&1
$billing | ForEach-Object { Write-Host "   $_" }

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "📊 NEXT: Export Billing CSV for Detailed Analysis" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""
Write-Host "Go to: https://console.cloud.google.com/billing/reports" -ForegroundColor Blue
Write-Host "Click: Download CSV" -ForegroundColor Blue
Write-Host "Share: The CSV data with exact charges per service per project" -ForegroundColor Blue
Write-Host ""
