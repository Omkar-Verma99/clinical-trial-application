#!/usr/bin/env node

console.log("╔════════════════════════════════════════════════════════════════════════════╗");
console.log("║     SCALING ANALYSIS: 100 Users + 2,000 Patients on FREE TIERS          ║");
console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

// ============================================================================
// SCENARIO DEFINITION
// ============================================================================
console.log("📊 SCENARIO: Current Pilot vs Scaled-Up Application\n");

const scenarios = {
  current: {
    label: "Current Pilot (3 patients, 37 staff)",
    users: 40,
    patients: 3,
    dailyActiveUsers: 5,
    requestsPerUserPerDay: 20,
    firestoreOpsPerRequest: 8,
    storage_mb: 10,
  },
  scaled: {
    label: "Scaled-Up (2,000 patients, 100 users)",
    users: 100,
    patients: 2000,
    dailyActiveUsers: 25,
    requestsPerUserPerDay: 30,
    firestoreOpsPerRequest: 15,
    storage_mb: 500,
  },
};

function analyzeScenario(name, scenario) {
  console.log(`\n${"═".repeat(76)}`);
  console.log(`📌 ${scenario.label}`);
  console.log(`${"═".repeat(76)}\n`);

  // Calculate request volume
  const requestsPerDay = scenario.dailyActiveUsers * scenario.requestsPerUserPerDay;
  const requestsPerMonth = requestsPerDay * 30;
  
  console.log("📈 REQUEST VOLUME:");
  console.log(`   • Daily active users: ${scenario.dailyActiveUsers}`);
  console.log(`   • Requests per user per day: ${scenario.requestsPerUserPerDay}`);
  console.log(`   • Total requests/day: ${requestsPerDay.toLocaleString()}`);
  console.log(`   • Total requests/month: ${requestsPerMonth.toLocaleString()}`);

  // Cloud Run Analysis
  console.log("\n☁️  CLOUD RUN PRICING:");
  const cloudRunFreeLimit = 2_000_000;
  const cloudRunCharge = requestsPerMonth > cloudRunFreeLimit ? (requestsPerMonth - cloudRunFreeLimit) * 0.00000040 : 0;
  const cloudRunStatus = requestsPerMonth <= cloudRunFreeLimit ? "✅ FREE" : "❌ PAID";
  console.log(`   Free tier limit: 2,000,000 requests/month`);
  console.log(`   Your usage: ${requestsPerMonth.toLocaleString()} requests/month`);
  console.log(`   Overage: ${Math.max(0, requestsPerMonth - cloudRunFreeLimit).toLocaleString()} requests`);
  console.log(`   Cost: $${cloudRunCharge.toFixed(2)}/month ${cloudRunStatus}`);

  // Firestore Reads Analysis
  console.log("\n📖 FIRESTORE READS (daily breakdown):");
  const readsPerDay = requestsPerDay * scenario.firestoreOpsPerRequest;
  const firestoreReadFreeLimit = 50_000;
  const readStatus = readsPerDay <= firestoreReadFreeLimit ? "✅ FREE" : "❌ PAID";
  const readCost = readsPerDay > firestoreReadFreeLimit ? (readsPerDay - firestoreReadFreeLimit) * 0.000003 * 30 : 0;
  console.log(`   Free tier limit: 50,000 reads/day`);
  console.log(`   Your usage: ${readsPerDay.toLocaleString()} reads/day`);
  console.log(`   Monthly estimate: ${(readsPerDay * 30).toLocaleString()} reads`);
  console.log(`   Status: ${readStatus}`);
  if (readsPerDay > firestoreReadFreeLimit) {
    console.log(`   ⚠️  Daily overage: ${(readsPerDay - firestoreReadFreeLimit).toLocaleString()} reads`);
    console.log(`   Cost: $${readCost.toFixed(2)}/month`);
  }

  // Firestore Writes Analysis
  console.log("\n✏️  FIRESTORE WRITES (daily breakdown):");
  const writesPerDay = Math.ceil(requestsPerDay * 0.3); // ~30% of requests write
  const firestoreWriteFreeLimit = 20_000;
  const writeStatus = writesPerDay <= firestoreWriteFreeLimit ? "✅ FREE" : "❌ PAID";
  const writeCost = writesPerDay > firestoreWriteFreeLimit ? (writesPerDay - firestoreWriteFreeLimit) * 0.000006 * 30 : 0;
  console.log(`   Free tier limit: 20,000 writes/day`);
  console.log(`   Your usage: ${writesPerDay.toLocaleString()} writes/day`);
  console.log(`   Monthly estimate: ${(writesPerDay * 30).toLocaleString()} writes`);
  console.log(`   Status: ${writeStatus}`);
  if (writesPerDay > firestoreWriteFreeLimit) {
    console.log(`   ⚠️  Daily overage: ${(writesPerDay - firestoreWriteFreeLimit).toLocaleString()} writes`);
    console.log(`   Cost: $${writeCost.toFixed(2)}/month`);
  }

  // Firebase Auth Analysis
  console.log("\n🔐 FIREBASE AUTH:");
  const authFreeLimit = 50_000;
  const authStatus = scenario.users <= authFreeLimit ? "✅ FREE" : "❌ PAID";
  console.log(`   Free tier limit: 50,000 users`);
  console.log(`   Your users: ${scenario.users}`);
  console.log(`   Status: ${authStatus}`);

  // Firestore Storage Analysis
  console.log("\n💾 FIRESTORE STORAGE:");
  const storageFreeLimit = 1_000; // 1GB
  const storageStatus = scenario.storage_mb <= storageFreeLimit ? "✅ FREE" : "⚠️  MAY BE PAID";
  const storageCost = scenario.storage_mb > storageFreeLimit ? (scenario.storage_mb - storageFreeLimit) * 0.18 / 1024 : 0;
  console.log(`   Free tier limit: 1,000 MB (1 GB) stored`);
  console.log(`   Your estimated storage: ${scenario.storage_mb.toLocaleString()} MB`);
  console.log(`   Status: ${storageStatus}`);
  if (scenario.storage_mb > storageFreeLimit) {
    console.log(`   Cost: $${storageCost.toFixed(2)}/month`);
  }

  // Cloud Logging Analysis
  console.log("\n📋 CLOUD LOGGING:");
  const loggingFreeLimit = 50; // 50GB
  const loggingEstimate = 0.5; // ~0.5 GB/month (minimal for this app)
  console.log(`   Free tier limit: 50 GB/month`);
  console.log(`   Your estimated usage: ${loggingEstimate} GB/month`);
  console.log(`   Status: ✅ FREE`);

  // Total Cost Calculation
  console.log("\n💰 TOTAL MONTHLY COST:");
  const totalCost = cloudRunCharge + readCost + writeCost + storageCost;
  console.log(`   Cloud Run: $${cloudRunCharge.toFixed(2)}`);
  console.log(`   Firestore Reads: $${readCost.toFixed(2)}`);
  console.log(`   Firestore Writes: $${writeCost.toFixed(2)}`);
  console.log(`   Storage: $${storageCost.toFixed(2)}`);
  console.log(`   ─────────────────────`);
  console.log(`   TOTAL: $${totalCost.toFixed(2)}/month`);
  
  if (totalCost === 0) {
    console.log(`   ✅ COMPLETELY FREE!`);
  } else if (totalCost < 5) {
    console.log(`   ✅ Very affordable (less than $5/month)`);
  }

  return totalCost;
}

// Run analysis for both scenarios
const currentCost = analyzeScenario("current", scenarios.current);
const scaledCost = analyzeScenario("scaled", scenarios.scaled);

// ============================================================================
// COMPARISON & RECOMMENDATIONS
// ============================================================================
console.log(`\n${"═".repeat(76)}`);
console.log("📊 COMPARISON SUMMARY");
console.log(`${"═".repeat(76)}\n`);

console.log(`Current Pilot:      $${currentCost.toFixed(2)}/month`);
console.log(`Scaled-Up (2k pts): $${scaledCost.toFixed(2)}/month`);
console.log(`\nCost Increase: $${(scaledCost - currentCost).toFixed(2)}/month\n`);

// ============================================================================
// KEY INSIGHTS
// ============================================================================
console.log(`${"═".repeat(76)}`);
console.log("🎯 KEY INSIGHTS");
console.log(`${"═".repeat(76)}\n`);

if (scenarios.scaled.dailyActiveUsers * scenarios.scaled.requestsPerUserPerDay * scenarios.scaled.firestoreOpsPerRequest <= 50_000) {
  console.log("✅ Firestore reads: Well within free tier");
} else if (scenarios.scaled.dailyActiveUsers * scenarios.scaled.requestsPerUserPerDay * scenarios.scaled.firestoreOpsPerRequest <= 100_000) {
  console.log("⚠️  Firestore reads: May approach or slightly exceed free tier");
} else {
  console.log("❌ Firestore reads: Will significantly exceed free tier");
}

if (scenarios.scaled.dailyActiveUsers * scenarios.scaled.requestsPerUserPerDay <= 2_000_000 / 30) {
  console.log("✅ Cloud Run requests: Massive free tier headroom (2M requests/month)");
}

console.log("✅ Firebase Auth: 100 users << 50,000 user limit");
console.log("✅ Database storage: 500 MB << 1,000 MB limit");
console.log("✅ Cloud Logging: Minimal impact on free tier");

// ============================================================================
// RECOMMENDATIONS
// ============================================================================
console.log(`\n${"═".repeat(76)}`);
console.log("💡 RECOMMENDATIONS");
console.log(`${"═".repeat(76)}\n`);

console.log("1. YES - Cloud Run is still FREE at this scale");
console.log("   • Estimated: $0/month for normal usage patterns\n");

console.log("2. Firestore considerations at scale:");
console.log("   • Each query should be optimized");
console.log("   • Use indexing efficiently for large patient datasets");
console.log("   • Batch operations when possible\n");

console.log("3. To gain even more free tier capacity:");
console.log("   • Implement result pagination (reduces reads per request)");
console.log("   • Cache frequently accessed data (reduces Firestore queries)");
console.log("   • Use Firestore Security Rules to reduce unnecessary operations\n");

console.log("4. Monitoring & alerts:");
console.log("   • Set up Cloud Billing alerts at $5/month (safety net)");
console.log("   • Monitor daily Cloud Run requests");
console.log("   • Track Firestore read/write volumes\n");

console.log(`${"═".repeat(76)}`);
console.log("✅ CONCLUSION: Cloud Run migration keeps you FREE even at 2,000 patients!");
console.log(`${"═".repeat(76)}\n`);
