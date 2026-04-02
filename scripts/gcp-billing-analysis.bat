@echo off
REM Google Cloud Billing Analysis Script (Batch version)
REM Uses gcloud CLI to analyze costs

setlocal enabledelayedexpansion

set "GCLOUD="C:\Users\Omkar.Verma\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd""

echo.
echo ════════════════════════════════════════════════════════════════════════════
echo        GOOGLE CLOUD BILLING ANALYSIS - PROJECT BREAKDOWN
echo ════════════════════════════════════════════════════════════════════════════
echo.

echo Step 1: Checking authentication status...
echo.
%GCLOUD% auth list
echo.
if errorlevel 1 (
    echo ❌ NOT AUTHENTICATED!
    echo To authenticate, run: gcloud auth login
    exit /b 1
)

echo Step 2: Listing all projects...
echo.
%GCLOUD% projects list
echo.

echo Step 3: Listing billing accounts...
echo.
%GCLOUD% billing accounts list
echo.

echo Step 4: Current configuration...
echo.
%GCLOUD% config list
echo.

echo ════════════════════════════════════════════════════════════════════════════
echo                    HOW TO GET EXACT BILLING BREAKDOWN
echo ════════════════════════════════════════════════════════════════════════════
echo.
echo Option 1 (BEST): Export from Google Cloud Console
echo   1. Go to: https://console.cloud.google.com/billing/reports
echo   2. Show 'Group by Service'
echo   3. Click 'Download CSV'
echo   4. Open CSV and analyze by service
echo.
echo Option 2: Using CLI commands
echo   gcloud billing accounts list
echo   gcloud services list --project=YOUR_PROJECT
echo   gcloud compute services list --project=YOUR_PROJECT
echo.
echo Option 3: Check specific services
echo   For App Engine:  %GCLOUD% app versions list --project=YOUR_PROJECT
echo   For Cloud Run:   %GCLOUD% run services list --project=YOUR_PROJECT
echo   For Firestore:   %GCLOUD% firestore databases describe --project=YOUR_PROJECT
echo.
echo ════════════════════════════════════════════════════════════════════════════
echo.
echo ✅ Google Cloud SDK is now working!
echo.
echo Next: Use the 'Download CSV' option above for exact billing breakdown.
echo.
pause
