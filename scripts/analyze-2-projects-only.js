#!/usr/bin/env node

const { execSync } = require('child_process');

const gcloud = '"C:\\Users\\Omkar.Verma\\AppData\\Local\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd"';

// KEEP only these 2 projects
const keepProjects = [
    "interakt-log-queue",
    "kollectcare-rwe-study"
];

// DELETE these projects
const deleteProjects = [
    "gifted-fragment-482706-h7",
    "kollectcare-event-bcc1a",
    "studio-5225388595-68162"
];

function run(cmd) {
    try {
        const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024 });
        return output.trim();
    } catch (error) {
        return `ERROR`;
    }
}

console.log("\n╔════════════════════════════════════════════════════════════════════════════╗");
console.log("║         ANALYZING 2 PROJECTS ONLY + DELETE CLEANUP PLAN                  ║");
console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

console.log("📊 CURRENT BILLING (Both projects only):");
console.log("━".repeat(80));
console.log("1. kollectcare-rwe-study: ₹879.05/month");
console.log("2. interakt-log-queue: ₹350.64/month");
console.log("─".repeat(80));
console.log("TOTAL (2 projects): ₹1,229.69\n");

console.log("📌 STEP 1: Analyze services in BOTH projects\n");

const projectDetails = {};

keepProjects.forEach((project, idx) => {
    console.log(`[${idx + 1}/${keepProjects.length}] Scanning: ${project}`);
    
    projectDetails[project] = {
        services: [],
        appEngine: null,
        cloudRun: [],
        firestore: null,
        pubsub: null,
        storage: null,
        logging: null
    };

    // Get enabled services
    const services = run(`${gcloud} services list --project=${project} --enabled --format="value(name)"`);
    if (services && !services.includes("ERROR")) {
        projectDetails[project].services = services.split('\n').filter(s => s.trim() && !s.includes("ERROR"));
    }

    // Check App Engine
    const appEngine = run(`${gcloud} app describe --project=${project} 2>&1`);
    projectDetails[project].appEngine = !appEngine.includes("ERROR");

    // Check Cloud Run
    const cloudRun = run(`${gcloud} run services list --project=${project} --format="value(metadata.name)"`);
    if (cloudRun && !cloudRun.includes("ERROR")) {
        projectDetails[project].cloudRun = cloudRun.split('\n').filter(s => s.trim());
    }

    // Check Firestore
    const firestore = run(`${gcloud} firestore databases describe --database=default --project=${project} 2>&1`);
    projectDetails[project].firestore = !firestore.includes("ERROR");

    console.log(`   ✓ Loaded (${projectDetails[project].services.length} services enabled)\n`);
});

console.log("\n" + "═".repeat(80));
console.log("📌 PROJECT DETAILS - SERVICES & COSTS");
console.log("═".repeat(80) + "\n");

Object.entries(projectDetails).forEach(([project, details]) => {
    console.log(`\n🔴 PROJECT: ${project}`);
    console.log("─".repeat(80));

    // List services
    console.log("\n✓ ENABLED SERVICES:");
    if (details.services.length > 0) {
        details.services.slice(0, 20).forEach(svc => {
            const service = svc.split('/').pop().replace('.googleapis.com', '');
            console.log(`   • ${service}`);
        });
        if (details.services.length > 20) {
            console.log(`   ... and ${details.services.length - 20} more`);
        }
    }

    // Check what's running
    console.log("\n✓ WHAT'S RUNNING:");
    if (details.appEngine) console.log("   ⚠️  App Engine: YES (EXPENSIVE!)");
    else console.log("   • App Engine: No");
    
    if (details.cloudRun.length > 0) {
        console.log(`   ⚠️  Cloud Run: YES (${details.cloudRun.length} service(s))`);
        details.cloudRun.forEach(svc => console.log(`       - ${svc}`));
    } else {
        console.log("   • Cloud Run: No");
    }
    
    if (details.firestore) console.log("   ✓ Firestore: YES (FREE tier)");
    else console.log("   • Firestore: No");
});

console.log("\n\n" + "═".repeat(80));
console.log("💰 COST ANALYSIS - WHY NOT FREE?");
console.log("═".repeat(80) + "\n");

const costs = {
    "interakt-log-queue": {
        actual: "₹350.64/month",
        culprits: [
            {
                service: "Cloud Logging",
                cost: "~₹150-200",
                reason: "Event queue logging (pub/sub messages)"
            },
            {
                service: "Cloud Pub/Sub",
                cost: "~₹100-150",
                reason: "Message publishing/subscription (queue processing)"
            },
            {
                service: "Cloud Storage (or other)",
                cost: "~₹50-100",
                reason: "Unknown - may be backup or artifacts"
            }
        ]
    },
    "kollectcare-rwe-study": {
        actual: "₹879.05/month",
        culprits: [
            {
                service: "Cloud Logging",
                cost: "~₹490",
                reason: "Health checks every 10 sec (app.yaml config)"
            },
            {
                service: "App Engine F2",
                cost: "~₹300-350",
                reason: "Always-on compute instance (min_instances: 1)"
            },
            {
                service: "Cloud Pub/Sub / Storage / Other",
                cost: "~₹50-100",
                reason: "Additional services or integration"
            }
        ]
    }
};

Object.entries(costs).forEach(([project, data]) => {
    console.log(`\n📍 ${project}: ${data.actual}`);
    console.log("─".repeat(80));
    data.culprits.forEach((culprit, idx) => {
        console.log(`\n  ${idx + 1}. ${culprit.service} (~${culprit.cost})`);
        console.log(`     Reason: ${culprit.reason}`);
    });
});

console.log("\n\n" + "═".repeat(80));
console.log("❌ PROJECTS TO DELETE (NOT NEEDED)");
console.log("═".repeat(80) + "\n");

deleteProjects.forEach((project, idx) => {
    console.log(`${idx + 1}. ${project}`);
    console.log(`   Command: gcloud projects delete ${project}`);
    console.log("");
});

console.log("\n" + "═".repeat(80));
console.log("DELETION INSTRUCTIONS");
console.log("═".repeat(80) + "\n");

console.log("To delete the 3 projects you don't need:\n");

deleteProjects.forEach(project => {
    console.log(`DELETE PROJECT: ${project}`);
    console.log(`  gcloud projects delete ${project} --quiet\n`);
});

console.log("\nWARNING: Deletion is PERMANENT!\n");
console.log("For safer deletion, use Google Cloud Console:");
console.log("  1. Go to: https://console.cloud.google.com/cloud-resource-manager");
console.log("  2. Select project");
console.log("  3. Click 'Delete'");
console.log("  4. Confirm\n");

console.log("\n" + "═".repeat(80));
console.log("NEXT STEPS");
console.log("═".repeat(80) + "\n");

console.log("1. ✓ I've analyzed your 2 projects");
console.log("2. → DELETE the 3 unused projects (via console or CLI)");
console.log("3. → I'll analyze code in both projects to find exact charges");
console.log("4. → Provide actionable fixes to reduce costs\n");
