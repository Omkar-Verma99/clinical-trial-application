# Deep Google Cloud Billing Analysis
# This script uses gcloud CLI to investigate billing in detail

Write-Host "╔════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          DEEP GOOGLE CLOUD BILLING ANALYSIS - CLI INVESTIGATION          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# First, let's check if gcloud is installed
Write-Host "Step 1: Checking gcloud CLI installation..." -ForegroundColor Yellow
try {
    $gcloudVersion = gcloud --version 2>&1
    Write-Host "✅ gcloud CLI available:" -ForegroundColor Green
    Write-Host $gcloudVersion -ForegroundColor Gray
} catch {
    Write-Host "❌ gcloud CLI not found. Please install Google Cloud SDK" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Getting all projects..." -ForegroundColor Yellow
Write-Host ""

# List all projects
$projects = gcloud projects list --format="value(projectId,name)" 2>&1
Write-Host "📋 Projects in your account:" -ForegroundColor Cyan
Write-Host $projects
Write-Host ""

# Get current project
$currentProject = gcloud config get-value project 2>&1
Write-Host "Current active project: $currentProject" -ForegroundColor Magenta
Write-Host ""

Write-Host "Step 3: Getting billing account information..." -ForegroundColor Yellow
Write-Host ""

# Get billing accounts
$billingAccounts = gcloud billing accounts list --format="value(name,displayName,open)" 2>&1
Write-Host "💰 Billing accounts:" -ForegroundColor Cyan
Write-Host $billingAccounts
Write-Host ""

# Extract billing account ID (first one)
$billingAccountId = ($billingAccounts | Select-Object -First 1).Split("/")[-1] -split " " | Select-Object -First 1
if ($billingAccountId) {
    Write-Host "Using billing account: $billingAccountId" -ForegroundColor Magenta
    Write-Host ""
    
    Write-Host "Step 4: Getting project-to-billing mappings..." -ForegroundColor Yellow
    Write-Host ""
    
    # Get projects linked to this billing account
    $linkedProjects = gcloud billing accounts get-iam-policy $billingAccountId --format="value(bindings[].members[])" 2>&1
    
    # Get all projects with their billing info
    $allProjectsWithBilling = gcloud beta billing projects list --billing-account=$billingAccountId --format="table(projectId,billingEnabled)" 2>&1
    Write-Host "📊 Projects linked to billing account $billingAccountId`:" -ForegroundColor Cyan
    Write-Host $allProjectsWithBilling
    Write-Host ""
}

Write-Host "Step 5: Getting detailed cost breakdown..." -ForegroundColor Yellow
Write-Host ""

# Try to get BigQuery billing data (if available)
Write-Host "⚠️  Note: Detailed billing data requires BigQuery export to be enabled on your billing account." -ForegroundColor Yellow
Write-Host "    To enable it: Go to Google Cloud Console > Billing > Billing Account Settings > Enable BigQuery Export" -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 6: Checking services enabled in current project..." -ForegroundColor Yellow
Write-Host ""

# List all enabled services in current project
$enabledServices = gcloud services list --enabled --format="table(name,title)" 2>&1 | Where-Object { $_ -match "run|logging|storage|firestore|cloud" }
Write-Host "🔧 Enabled services (compute/data related):" -ForegroundColor Cyan
Write-Host $enabledServices
Write-Host ""

Write-Host "Step 7: Checking Cloud Run deployments..." -ForegroundColor Yellow
Write-Host ""

try {
    $cloudRunServices = gcloud run services list --format="table(metadata.name,status.url,status.observedGeneration)" 2>&1
    Write-Host "☁️  Cloud Run services:" -ForegroundColor Cyan
    Write-Host $cloudRunServices
} catch {
    Write-Host "⚠️  Could not retrieve Cloud Run services (may not be available in this region)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Step 8: Checking App Engine deployments..." -ForegroundColor Yellow
Write-Host ""

try {
    $appEngineInfo = gcloud app describe --format="table(name,locationId,servingStatus)" 2>&1
    Write-Host "🚀 App Engine info:" -ForegroundColor Cyan
    Write-Host $appEngineInfo
    Write-Host ""
    
    $appEngineServices = gcloud app services list --format="table(id,traffic_split)" 2>&1
    Write-Host "App Engine services:" -ForegroundColor Cyan
    Write-Host $appEngineServices
} catch {
    Write-Host "⚠️  App Engine not deployed in this project" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Step 9: Checking Firestore usage..." -ForegroundColor Yellow
Write-Host ""

try {
    # Note: This requires Firestore to be enabled
    Write-Host "ℹ️  To view detailed Firestore metrics:" -ForegroundColor Cyan
    Write-Host "    Run: gcloud firestore indexes list" -ForegroundColor Gray
    Write-Host "    Or go to: https://console.cloud.google.com/firestore" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Firestore details not available via CLI" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Step 10: Checking Cloud Logging usage..." -ForegroundColor Yellow
Write-Host ""

try {
    # Check log sinks
    $logSinks = gcloud logging sinks list --format="table(name,destination)" 2>&1
    if ($logSinks) {
        Write-Host "📝 Log sinks (these send logs to GCP):" -ForegroundColor Cyan
        Write-Host $logSinks
    } else {
        Write-Host "No log sinks configured" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Could not retrieve log sinks" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Step 11: Getting recent operations and errors..." -ForegroundColor Yellow
Write-Host ""

try {
    # Get recent operations
    $operations = gcloud operations list --format="table(name,done,errors)" --limit=10 2>&1
    Write-Host "🔔 Recent operations (last 10):" -ForegroundColor Cyan
    Write-Host $operations
} catch {
    Write-Host "⚠️  Could not retrieve operations" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Step 12: Summary & Recommendations..." -ForegroundColor Yellow
Write-Host ""

Write-Host "╔════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                          KEY FINDINGS                                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "📌 What's charging you (from your screenshot):" -ForegroundColor Green
Write-Host "   1. Cloud Logging - Logs from your App Engine/Cloud Run"
Write-Host "   2. Cloud Run - Your backend is running"
Write-Host "   3. Cloud Storage - If you're storing files"
Write-Host "   4. Possibly: Cloud Firestore reads/writes"
Write-Host ""

Write-Host "🔍 To get EXACT billing breakdown:" -ForegroundColor Green
Write-Host "   1. Enable BigQuery export (in Billing Account Settings)"
Write-Host "   2. Run this query in BigQuery:" -ForegroundColor Gray
Write-Host ""
Write-Host "      SELECT" -ForegroundColor Gray
Write-Host "        service.description, " -ForegroundColor Gray
Write-Host "        SUM(cost) as total_cost," -ForegroundColor Gray
Write-Host "        SUM(usage.amount) as total_usage," -ForegroundColor Gray
Write-Host "        usage.unit" -ForegroundColor Gray
Write-Host "      FROM \`billing_dataset.gcp_billing_export_v1_YOUR_PROJECT\`" -ForegroundColor Gray
Write-Host "      WHERE RANGE_BETWEEN(usage_start_time, TIMESTAMP('2026-02-01'), TIMESTAMP('2026-03-31'))" -ForegroundColor Gray
Write-Host "      GROUP BY service.description, usage.unit" -ForegroundColor Gray
Write-Host "      ORDER BY total_cost DESC" -ForegroundColor Gray
Write-Host ""

Write-Host "⚠️  To REDUCE costs:" -ForegroundColor Yellow
Write-Host "   1. Cloud Run: Check min_instances (should be 0, not 1)"
Write-Host "   2. Cloud Logging: Disable health check logs or reduce frequency"
Write-Host "   3. Cloud Storage: Check if unused buckets exist"
Write-Host "   4. Delete unused resources (old instances, buckets, etc.)"
Write-Host ""

Write-Host "✅ Next steps:" -ForegroundColor Cyan
Write-Host "   1. Run: gcloud billing accounts list"
Write-Host "   2. Run: gcloud beta billing projects list --billing-account=YOUR_ACCOUNT_ID"
Write-Host "   3. Check Google Cloud Console > Billing > Cost Table"
Write-Host "   4. Export billing data to BigQuery for detailed analysis"
Write-Host ""
