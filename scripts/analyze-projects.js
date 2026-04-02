#!/usr/bin/env node

const { execSync } = require('child_process');

const gcloud = '"C:\\Users\\Omkar.Verma\\AppData\\Local\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd"';

const projects = [
    "gifted-fragment-482706-h7",
    "interakt-log-queue",
    "kollectcare-event-bcc1a",
    "kollectcare-rwe-study",
    "studio-5225388595-68162"
];

console.log("\n╔════════════════════════════════════════════════════════════════════════════╗");
console.log("║              ANALYZING ALL GOOGLE CLOUD PROJECTS & SERVICES               ║");
console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

function runCommand(cmd) {
    try {
        const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        return output.trim();
    } catch (error) {
        return `ERROR: ${error.message}`;
    }
}

projects.forEach((project) => {
    console.log("━".repeat(80));
    console.log(`📌 PROJECT: ${project}`);
    console.log("━".repeat(80) + "\n");

    // Check enabled services
    console.log("🔧 Enabled Services:");
    const services = runCommand(`${gcloud} services list --project=${project} --enabled --format="value(name)"`);
    if (services && !services.includes("ERROR")) {
        services.split('\n').filter(s => s.trim()).slice(0, 15).forEach(svc => {
            console.log(`   ✓ ${svc}`);
        });
        if (services.split('\n').length > 15) {
            console.log(`   ... and ${services.split('\n').length - 15} more`);
        }
    } else {
        console.log(`   (Unable to read or no services enabled)`);
    }
    console.log();

    // Check App Engine
    console.log("⚙️  App Engine Deployments:");
    const appEngine = runCommand(`${gcloud} app describe --project=${project}`);
    if (appEngine && !appEngine.includes("ERROR")) {
        const lines = appEngine.split('\n').slice(0, 5);
        lines.forEach(line => {
            if (line.trim()) console.log(`   ${line}`);
        });
    } else {
        console.log(`   ✗ Not deployed (or no App Engine in this project)`);
    }
    console.log();

    // Check Cloud Run
    console.log("☁️  Cloud Run Services:");
    const cloudRun = runCommand(`${gcloud} run services list --project=${project} --format="table(name,status)"`);
    if (cloudRun && !cloudRun.includes("ERROR")) {
        const lines = cloudRun.split('\n');
        if (lines.length > 1) {
            lines.slice(0, 10).forEach(line => {
                if (line.trim()) console.log(`   ${line}`);
            });
        } else {
            console.log(`   (No Cloud Run services deployed)`);
        }
    } else {
        console.log(`   (No Cloud Run services)`);
    }
    console.log();

    // Check Firestore
    console.log("📊 Firestore:");
    const firestore = runCommand(`${gcloud} firestore databases describe --database=default --project=${project}`);
    if (firestore && !firestore.includes("ERROR")) {
        const lines = firestore.split('\n').slice(0, 5);
        lines.forEach(line => {
            if (line.trim()) console.log(`   ${line}`);
        });
    } else {
        console.log(`   (No Firestore deployed)`);
    }
    console.log();
    console.log();
});

console.log("━".repeat(80));
console.log("📌 BILLING ACCOUNTS");
console.log("━".repeat(80) + "\n");

const billing = runCommand(`${gcloud} billing accounts list`);
console.log(billing);

console.log("\n" + "━".repeat(80));
console.log("📌 KEY FINDINGS");
console.log("━".repeat(80) + "\n");

console.log(`Total Projects Analyzed: ${projects.length}`);
console.log(`Main Project (with charges): kollectcare-rwe-study`);
console.log(`Secondary Project: kollectcare-event-bcc1a\n`);

console.log("🎯 RECOMMENDED NEXT STEPS:\n");
console.log("1. Go to: https://console.cloud.google.com/billing/reports");
console.log("2. Select 'Group by SERVICE'");
console.log("3. Click 'Download CSV'");
console.log("4. Share the CSV - we can analyze exact charges by service\n");

console.log("Or, to proceed directly with Cloud Run migration:");
console.log("→ Just say 'YES' and I'll start the migration immediately");
console.log("→ This will move you from expensive app engine to free Cloud Run tier\n");
