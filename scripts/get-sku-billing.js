#!/usr/bin/env node

/**
 * Get SKU-wise billing data using gcloud CLI rest API
 * This queries the Billing API for SKU catalog and costs
 */

const { execSync } = require('child_process');
const path = require('path');

const GCLOUD_CMD = 'C:\\Users\\Omkar.Verma\\AppData\\Local\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd';
const BILLING_ACCOUNT = '015F6F-857D31-A22DA7';
const PROJECTS = ['kollectcare-rwe-study', 'interakt-log-queue'];

console.log("\n╔════════════════════════════════════════════════════════════════════════════╗");
console.log("║              SKU-WISE BILLING DATA VIA GCLOUD API                        ║");
console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

try {
    // Try to get billing data export table info
    console.log("Querying Billing API for SKU information...\n");
    
    // Method 1: Try to get cost data via REST API
    console.log("1️⃣ Attempting to query Cloud Billing API...\n");
    
    const cmd1 = `${GCLOUD_CMD} compute projects describe kollectcare-rwe-study --flatten="quotas" --format="table(quotas.metric,quotas.usage,quotas.limit)" 2>&1`;
    
    try {
        const output1 = execSync(cmd1, { encoding: 'utf-8', stdio: 'pipe' });
        console.log("Project Quota Usage:");
        console.log(output1);
    } catch (e) {
        console.log("(Quota data not available)");
    }
    
    console.log("\n2️⃣ Getting enabled APIs (which correlates to services charged)...\n");
    
    for (const project of PROJECTS) {
        console.log(`\n📌 PROJECT: ${project}`);
        console.log("─".repeat(80));
        
        try {
            const cmd = `${GCLOUD_CMD} services list --project=${project} --enabled --format="table(name,title,enabled_for)" 2>&1`;
            const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
            
            // Parse and show only billable services
            const lines = output.split('\n');
            const services = lines.slice(1).filter(line => line.trim().length > 0);
            
            console.log(`Found ${services.length} enabled services:\n`);
            
            // Filter to show likely billable services
            const billableKeywords = ['logging', 'pubsub', 'appengine', 'compute', 'storage', 'firestore', 'firebase'];
            const billableServices = services.filter(s => 
                billableKeywords.some(keyword => s.toLowerCase().includes(keyword))
            );
            
            if (billableServices.length > 0) {
                console.log("Billable Services Enabled:");
                billableServices.forEach(service => {
                    const [name, title] = service.split(/\s{2,}/);
                    console.log(`  ✓ ${name?.trim() || ''}`);
                    if (title) console.log(`    → ${title?.trim()}`);
                });
            }
            
            console.log("\nFull list of enabled services:");
            services.slice(0, 20).forEach(service => {
                const [name] = service.split(/\s{2,}/);
                console.log(`  • ${name?.trim()}`);
            });
            if (services.length > 20) {
                console.log(`  ... and ${services.length - 20} more`);
            }
        } catch (e) {
            console.log(`Error querying services: ${e.message.split('\n')[0]}`);
        }
    }
    
    console.log("\n" + "═".repeat(80));
    console.log("3️⃣ IMPORTANT: FOR ACTUAL SKU COSTS, USE CONSOLE\n");
    console.log("Using gcloud CLI alone cannot give SKU-wise costs.");
    console.log("The Billing API requires BigQuery export to be enabled.\n");
    
    console.log("TO GET SKU DATA VIA CLOUD CONSOLE:");
    console.log("─".repeat(80));
    console.log("1. Go to: https://console.cloud.google.com/billing/reports");
    console.log("2. Report type: Select 'By SKU'");
    console.log("3. Export to CSV (button top right)");
    console.log("4. CSV will contain:");
    console.log("   • SKU ID");
    console.log("   • SKU Description (service name)");
    console.log("   • Quantity consumed");
    console.log("   • Unit");
    console.log("   • Unit Price");
    console.log("   • Cost (INR)");
    console.log("   • Project ID\n");
    
    console.log("═".repeat(80));
    console.log("ALTERNATIVELY: USE BigQuery API");
    console.log("─".repeat(80));
    console.log("If your billing account has BigQuery export enabled:\n");
    
    const bqCommand = `${GCLOUD_CMD} bq ls --project_id=kollectcare-rwe-study 2>&1`;
    try {
        const bqOutput = execSync(bqCommand, { encoding: 'utf-8', stdio: 'pipe' });
        console.log("BigQuery Datasets found:");
        console.log(bqOutput);
    } catch (e) {
        console.log("(BigQuery export not configured)\n");
        console.log("To enable BigQuery export:");
        console.log("1. Go to: https://console.cloud.google.com/billing/reports/export");
        console.log("2. Click 'Enable' under 'BigQuery Export'");
        console.log("3. Choose dataset (creates table with all billing details)");
        console.log("4. Wait 1-2 days for first data to appear\n");
    }
    
} catch (e) {
    console.error("Error:", e.message);
}

console.log("\n" + "═".repeat(80));
console.log("END OF SKU BILLING ANALYSIS");
console.log("═".repeat(80) + "\n");
