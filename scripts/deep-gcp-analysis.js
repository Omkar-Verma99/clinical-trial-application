#!/usr/bin/env node

const { execSync } = require('child_process');

console.log("╔════════════════════════════════════════════════════════════════════════════╗");
console.log("║          DEEP GOOGLE CLOUD BILLING ANALYSIS - CLI INVESTIGATION          ║");
console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

function runCommand(cmd, label) {
  try {
    console.log(`\n📌 ${label}`);
    console.log(`   Command: ${cmd}\n`);
    const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    console.log(output);
    return output;
  } catch (error) {
    console.log(`   ⚠️  ${error.message.split('\n')[0]}`);
    return null;
  }
}

// Step 1: Check gcloud version
console.log("Step 1: Checking gcloud CLI...");
try {
  execSync('gcloud --version', { stdio: 'pipe' });
  console.log("✅ gcloud CLI is available\n");
} catch (e) {
  console.log("❌ gcloud CLI not found. Please install Google Cloud SDK\n");
  process.exit(1);
}

// Step 2: Get current project
console.log("Step 2: Getting project information...");
const currentProject = runCommand('gcloud config get-value project', 'Current active project');

// Step 3: List all projects
runCommand('gcloud projects list --format="table(projectId,name,projectNumber)"', '📋 All projects in your account');

// Step 4: Get billing accounts
runCommand('gcloud billing accounts list --format="table(name,displayName,open)"', '💰 Billing accounts');

// Step 5: Get billing info for current project
if (currentProject && currentProject.trim()) {
  const project = currentProject.trim();
  runCommand(`gcloud beta billing projects describe ${project} --format="table(billingAccountName,billingEnabled)"`, 
    `💳 Billing info for project: ${project}`);
}

// Step 6: Check enabled services
runCommand('gcloud services list --enabled --format="table(name,title)"', '🔧 All enabled services');

// Step 7: Check specifically for compute services
console.log("\n📊 Computing/Storage Services Enabled:");
const servicesList = [
  'cloud.googleapis.com',
  'compute.googleapis.com',
  'appengine.googleapis.com',
  'run.googleapis.com',
  'firestore.googleapis.com',
  'storage-api.googleapis.com',
  'logging.googleapis.com',
  'monitoring.googleapis.com'
];

for (const service of servicesList) {
  try {
    const result = execSync(`gcloud services list --enabled --filter="name:${service}" --format="value(name,title)"`, 
      { encoding: 'utf-8', stdio: 'pipe' });
    if (result.trim()) {
      console.log(`   ✅ ${result.trim()}`);
    }
  } catch (e) {
    // Service not enabled, skip
  }
}

// Step 8: Check Cloud Run deployments
console.log("\n");
runCommand('gcloud run services list --region us-central1 --format="table(metadata.name,metadata.namespace,status.url)"', 
  '☁️  Cloud Run services (us-central1)');

// Step 9: Check App Engine
console.log("\n");
const appEngineCheck = runCommand('gcloud app describe --format="table(name,locationId,servingStatus)"', 
  '🚀 App Engine status');

if (appEngineCheck) {
  runCommand('gcloud app services list --format="table(id,traffic_split)"', 'App Engine services');
}

// Step 10: Check command for detailed billing export
console.log("\n");
console.log("╔════════════════════════════════════════════════════════════════════════════╗");
console.log("║                    MANUAL DEEP DIVE INSTRUCTIONS                         ║");
console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

console.log("📌 To see EXACT breakdown of charges, you MUST:\n");

console.log("STEP 1️⃣  - Export Billing Data to BigQuery:");
console.log("   └─ Go to: https://console.cloud.google.com/billing/linkedaccount");
console.log("   └─ Click on your billing account");
console.log("   └─ Go to Settings (left menu)");
console.log("   └─ Under 'BigQuery export', click 'Enable'");
console.log("   └─ Select or create a BigQuery dataset (e.g., 'billing_exports')");
console.log("   └─ Wait 24 hours for data to populate\n");

console.log("STEP 2️⃣  - Query the billing data:");
console.log("   └─ Go to: https://console.cloud.google.com/bigquery");
console.log("   └─ Create a new query with this SQL:\n");

console.log('      SELECT');
console.log('        invoice.month,');
console.log('        service.description as Service,');
console.log('        SKU.description as SKU,');
console.log('        ROUND(SUM(cast(usage.amount as float64)), 2) as Usage_Amount,');
console.log('        usage.unit,');
console.log('        ROUND(SUM(cast(cost as float64)), 2) as Cost_USD');
console.log('      FROM `billing_dataset.gcp_billing_export_v1_*`');
console.log('      WHERE DATE(usage_start_time) >= "2026-02-01"');
console.log('      GROUP BY invoice.month, service.description, SKU.description, usage.unit');
console.log('      ORDER BY Cost_USD DESC');
console.log('      LIMIT 100\n');

console.log("STEP 3️⃣  - Check your current deployments:");
console.log("   └─ App Engine: gcloud app describe");
console.log("   └─ Cloud Run: gcloud run services list --all-regions");
console.log("   └─ Compute: gcloud compute instances list\n");

console.log("╔════════════════════════════════════════════════════════════════════════════╗");
console.log("║                    COST ANALYSIS FROM IMAGE                              ║");
console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

console.log("From your screenshot (₹870.44 / $10.50 USD):\n");
console.log("Services charged:");
console.log("  1. Cloud Logging ✅");
console.log("     └─ Source: Health checks + application logs");
console.log("     └─ Estimate: $2-5/month");
console.log("");
console.log("  2. Cloud Run ⚠️  (appears to be highest)");
console.log("     └─ Source: Your Next.js app running");
console.log("     └─ Estimate: $5-20/month depending on config");
console.log("     └─ Check: min_instances, memory, requests");
console.log("");
console.log("  3. Cloud Storage (if enabled)");
console.log("     └─ Source: File storage or backups");
console.log("     └─ Estimate: $0.02-2/month");
console.log("");
console.log("  4. Firestore (possibly)");
console.log("     └─ Source: Database reads/writes");
console.log("     └─ Estimate: Usually $0 (within free tier)");
console.log("");

console.log("╔════════════════════════════════════════════════════════════════════════════╗");
console.log("║                    QUICK TROUBLESHOOTING CHECKLIST                       ║");
console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

console.log("Check these now (via Cloud Console):\n");
console.log("☑️  1. App Engine instances:");
console.log("     └─ Go to App Engine > Instances");
console.log("     └─ Look for min_instances value (should be 0, not 1)\n");

console.log("☑️  2. Cloud Run configuration:");
console.log("     └─ Go to Cloud Run > Services");
console.log("     └─ Click your service > Revisions");
console.log("     └─ Check 'Minimum instances' (should be 0)\n");

console.log("☑️  3. Multiple projects:");
console.log("     └─ Check if you accidentally have multiple projects");
console.log("     └─ Each might be running resources independently\n");

console.log("☑️  4. Orphaned resources:");
console.log("     └─ Old App Engine instances still running?");
console.log("     └─ Old Compute Engine VMs?");
console.log("     └─ Delete: gcloud app delete\n");

console.log("╔════════════════════════════════════════════════════════════════════════════╗");
console.log("║                    NEXT COMMAND TO RUN                                    ║");
console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

console.log("Run this command to see ALL resources consuming costs:\n");
console.log("  gcloud beta billing projects list --billing-account=YOUR_BILLING_ID\n");
console.log("Where YOUR_BILLING_ID comes from the 'Billing accounts' output above.\n");
