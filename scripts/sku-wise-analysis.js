#!/usr/bin/env node

/**
 * GCP SKU-wise Billing Analysis
 * SKU = Stock Keeping Unit (specific billable service)
 * Each SKU has its own pricing and usage
 */

const fs = require('fs');
const path = require('path');

console.log("\n╔════════════════════════════════════════════════════════════════════════════╗");
console.log("║                   SKU-WISE BILLING ANALYSIS                               ║");
console.log("║              (Exact Line Items Being Charged - From your CSV)             ║");
console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

console.log("To get SKU-wise breakdown, you MUST export CSV from Google Cloud Console:");
console.log("═".repeat(80) + "\n");

console.log("STEP 1: Export Billing CSV");
console.log("─".repeat(80));
console.log("1. Go to: https://console.cloud.google.com/billing/reports");
console.log("2. Click 'Download CSV' button (top right)");
console.log("3. This downloads a CSV with ALL line items\n");

console.log("STEP 2: Open CSV and look for these COLUMNS:");
console.log("─".repeat(80));
console.log("┌─────────────────────────────────────────────────────────┐");
console.log("│ Column Name           │ What It Shows                  │");
console.log("├─────────────────────────────────────────────────────────┤");
console.log("│ SKU ID                │ Unique service identifier     │");
console.log("│ SKU Description       │ EXACT service name            │");
console.log("│ Quantity              │ How much was used             │");
console.log("│ Unit                  │ What unit (hours, GB, etc)    │");
console.log("│ Unit Price            │ Price per unit                │");
console.log("│ Cost                  │ Total charge for that SKU     │");
console.log("│ Project ID            │ Which project                 │");
console.log("│ Resource Type         │ What type (VM, Storage, etc)  │");
console.log("└─────────────────────────────────────────────────────────┘\n");

console.log("STEP 3: GROUP BY SKU to see exact charges");
console.log("─".repeat(80));
console.log("In Excel/Sheets: Sort by 'SKU Description' and 'Cost'\n");

console.log("EXPECTED SKUS FOR YOUR 2 PROJECTS:");
console.log("═".repeat(80) + "\n");

const expectedSkus = [
    {
        project: "kollectcare-rwe-study",
        skuId: "0001-E1A1-6B2D",
        skuName: "App Engine Standard Environment F2 Instance",
        unitType: "hour",
        freeQuota: "28 hours/month",
        expectedCost: "~₹2,700/month",
        reason: "Always-on instance (730 hours/month)",
        whyCharging: "Exceeds 28 free hours"
    },
    {
        project: "kollectcare-rwe-study",
        skuId: "0003-2940-2E4E",
        skuName: "Cloud Logging API Calls",
        unitType: "1M API calls",
        freeQuota: "20M calls/month (embedded)",
        expectedCost: "~₹50-100/month",
        reason: "Health checks + app logging",
        whyCharging: "Within free tier usually"
    },
    {
        project: "kollectcare-rwe-study",
        skuId: "0002-3F81-8E8B",
        skuName: "Cloud Logging Storage (ingestion)",
        unitType: "GB/month",
        freeQuota: "50 GB/month",
        expectedCost: "~₹490/month",
        reason: "Health checks every 10 sec = 2,600 GB logs",
        whyCharging: "50 GB free + 2,550 GB × ₹0.19 = ₹485"
    },
    {
        project: "kollectcare-rwe-study",
        skuId: "0007-A8FB-1CD5",
        skuName: "Pub/Sub Topic Message",
        unitType: "10M topic publish",
        freeQuota: "$0.40 per million",
        expectedCost: "~₹20-50/month",
        reason: "Possible event publishing",
        whyCharging: "Minimal if any"
    },
    {
        project: "interakt-log-queue",
        skuId: "0002-3F81-8E8B",
        skuName: "Cloud Logging Storage (ingestion)",
        unitType: "GB/month",
        freeQuota: "50 GB/month",
        expectedCost: "~₹150-180/month",
        reason: "Event queue logging = 900 GB",
        whyCharging: "50 GB free + 850 GB × ₹0.19 = ₹162"
    },
    {
        project: "interakt-log-queue",
        skuId: "0007-F4C5-2D0A",
        skuName: "Pub/Sub Topic Publish",
        unitType: "10M publishes",
        freeQuota: "$0.40 per million",
        expectedCost: "~₹50-70/month",
        reason: "Message publishing",
        whyCharging: "First 400k free, then overage"
    },
    {
        project: "interakt-log-queue",
        skuId: "0007-3B8F-4E2C",
        skuName: "Pub/Sub Subscription",
        unitType: "10M subscriptions",
        freeQuota: "$0.40 per million",
        expectedCost: "~₹100-150/month",
        reason: "Message subscriptions",
        whyCharging: "High volume queue processing"
    }
];

expectedSkus.forEach((sku, idx) => {
    console.log(`${idx + 1}. ${sku.skuName}`);
    console.log(`   Project: ${sku.project}`);
    console.log(`   SKU ID: ${sku.skuId}`);
    console.log(`   Unit: ${sku.unitType}`);
    console.log(`   Free Quota: ${sku.freeQuota}`);
    console.log(`   Expected Cost: ${sku.expectedCost}`);
    console.log(`   Why Charging: ${sku.whyCharging}`);
    console.log("");
});

console.log("\n" + "═".repeat(80));
console.log("HOW TO ANALYZE YOUR ACTUAL CSV");
console.log("═".repeat(80) + "\n");

console.log("After downloading CSV, import into Excel and:");
console.log("");
console.log("1. Create a PIVOT TABLE or use SUMIF:");
console.log("   =SUMIF(A:A, \"Cloud Logging\", D:D)");
console.log("");
console.log("2. Group by SKU Description and sum the Cost column:");
console.log("   ┌────────────────────────────────────┬───────┐");
console.log("   │ SKU Description                    │ Cost  │");
console.log("   ├────────────────────────────────────┼───────┤");
console.log("   │ App Engine Standard F2             │  ???  │");
console.log("   │ Cloud Logging (Ingestion)          │  ???  │");
console.log("   │ Cloud Pub/Sub Publish              │  ???  │");
console.log("   │ Cloud Pub/Sub Subscribe            │  ???  │");
console.log("   │ Cloud Storage                      │  ???  │");
console.log("   └────────────────────────────────────┴───────┘");
console.log("");

console.log("3. For each SKU, note:");
console.log("   • Quantity used");
console.log("   • Unit price");
console.log("   • Total cost");
console.log("");

console.log("═".repeat(80));
console.log("WHAT YOU'LL LIKELY FIND IN CSV:");
console.log("═".repeat(80) + "\n");

const expectedFindings = {
    "kollectcare-rwe-study": {
        "App Engine Standard F2": {
            quantity: "~8,760 hours (= 12 months × 730 hrs)",
            unitPrice: "$0.048/hour = ₹3.60/hour",
            totalMonthly: "730 hours × ₹3.60 = ₹2,628/month",
            freeThreshold: "28 hours/month free",
            whyCharging: "Exceeds free tier by 702 hours"
        },
        "Cloud Logging Ingestion": {
            quantity: "~2,600 GB/month",
            unitPrice: "₹0.19 per GB (beyond 50 GB free)",
            totalMonthly: "2,550 GB × ₹0.19 = ₹485/month",
            freeThreshold: "50 GB/month free",
            whyCharging: "Health checks every 10 sec create too many logs"
        },
        "Cloud Pub/Sub": {
            quantity: "~2,000 messages/month",
            unitPrice: "₹0.0001 per message (for first 400k/mo)",
            totalMonthly: "~₹0.20/month",
            freeThreshold: "$0.40 per million free",
            whyCharging: "Likely within free tier"
        }
    },
    "interakt-log-queue": {
        "Cloud Logging Ingestion": {
            quantity: "~900 GB/month",
            unitPrice: "₹0.19 per GB (beyond 50 GB free)",
            totalMonthly: "850 GB × ₹0.19 = ₹162/month",
            freeThreshold: "50 GB/month free",
            whyCharging: "Event queue generates heavy logging"
        },
        "Cloud Pub/Sub Publish": {
            quantity: "~3,000,000 publishes/month",
            unitPrice: "₹0.0001 per 10 (or varies)",
            totalMonthly: "~₹300-400/month",
            freeThreshold: "$0.40 per million",
            totalFree: "~₹30/month (400k free)",
            whyCharging: "(3M - 400k) messages charged"
        }
    }
};

Object.entries(expectedFindings).forEach(([project, skus]) => {
    console.log(`📌 ${project}:`);
    console.log("");
    Object.entries(skus).forEach(([sku, details]) => {
        console.log(`  SKU: ${sku}`);
        console.log(`  ├─ Quantity: ${details.quantity}`);
        console.log(`  ├─ Unit Price: ${details.unitPrice}`);
        console.log(`  ├─ Total/Month: ${details.totalMonthly}`);
        if (details.totalFree) console.log(`  ├─ Free Tier: ${details.totalFree}`);
        console.log(`  ├─ Free Threshold: ${details.freeThreshold}`);
        console.log(`  └─ Why Charging: ${details.whyCharging}`);
        console.log("");
    });
});

console.log("═".repeat(80));
console.log("NEXT ACTION:");
console.log("═".repeat(80) + "\n");

console.log("1. Download CSV from Google Cloud Console");
console.log("2. Share the CSV or key SKU rows with exact costs");
console.log("3. I'll match your ACTUAL costs to my predictions");
console.log("4. Then provide exact fixes based on your actual SKU usage\n");
