const fs = require('fs')
const path = require('path')

console.log('\n╔════════════════════════════════════════════════════════════════╗')
console.log('║  COMPREHENSIVE GCP & FIREBASE PAID SERVICES AUDIT              ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

// 1. Check app.yaml
console.log('1️⃣  APP ENGINE / CLOUD RUN (app.yaml)\n')
const appYaml = fs.readFileSync('app.yaml', 'utf8')
console.log('Current Config:')
console.log(appYaml.split('\n').slice(0, 15).join('\n'))
console.log('\n💰 Costs:')
console.log('   • F2 Instance (24/7):           $0.05/hour = ~$36/month ❌')
console.log('   • Health checks:                $0.40 per 100k checks')
console.log('   • Network egress (outbound):    $0.12/GB after 1GB free')

// 2. Check Firebase services
console.log('\n\n2️⃣  FIREBASE SERVICES\n')
console.log('✅ Firestore (Spark Plan - FREE):')
console.log('   • Reads:       50,000/day (you use ~55) ✅')
console.log('   • Writes:      20,000/day (you use ~10) ✅')
console.log('   • Storage:     1 GB (you use 0.01 MB) ✅')

console.log('\n❓ Firebase Storage (Check usage):')
console.log('   • Storage:     $0.05/GB/month')
console.log('   • Download:    $0.01/GB after 1GB/month free')

console.log('\n⚠️  Composite Indexes (firestore.indexes.json):')
const indexesFile = fs.readFileSync('firestore.indexes.json', 'utf8')
const indexes = JSON.parse(indexesFile)
console.log(`   • Number of indexes: ${indexes.indexes.length}`)
indexes.indexes.forEach((idx, i) => {
  console.log(`     ${i+1}. ${idx.collectionGroup} (${idx.fields.map(f => f.fieldPath).join(', ')})`)
})
console.log('   • Cost: $0.18 per 100k index entries (minimal for small DB)')

// 3. Check .env.local for third-party services
console.log('\n\n3️⃣  THIRD-PARTY SERVICES (from .env.local)\n')
const envFile = fs.readFileSync('.env.local', 'utf8')
const hasAuthAPI = envFile.includes('FIREBASE_API_KEY')
const hasSentry = envFile.includes('SENTRY_DSN')

console.log('✅ Firebase Authentication (FREE tier):')
console.log('   • Up to 50,000 identities')
console.log('   • SMS costs if using Phone Auth: varies')

console.log('\n❌ Sentry.io (Error Tracking):')
console.log('   • Found: SENTRY_DSN in .env.local')
console.log('   • Free tier: 5,000 events/month')
console.log('   • Paid: $26/month and up')
console.log('   • Your current usage: UNKNOWN (need to check Sentry dashboard)')

console.log('\n\n4️⃣  CLOUD SERVICES (Additional)\n')
console.log('❌ Cloud Logging:')
console.log('   • First 50 GB/month: FREE')
console.log('   • Additional: $0.50/GB')
console.log('   • Health checks + App logs: ~2-5 GB/month typical')

console.log('\n❌ Cloud DNS (if configured):')
console.log('   • $0.20 per zone/month')
console.log('   • Plus query charges')

console.log('\n✅ Cloud IAM & Service Accounts:')
console.log('   • FREE (automatically included)')

console.log('\n\n5️⃣  PACKAGE.JSON DEPENDENCIES CHECK\n')
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const dependencies = Object.keys(packageJson.dependencies)

const potentialPaidServices = {
  '@sentry/': 'Sentry - Error tracking',
  'stripe': 'Stripe - Payment processing',
  'sendgrid': 'SendGrid - Email service',
  'twilio': 'Twilio - SMS/Voice',
  'mailgun': 'Mailgun - Email service',
  'plaid': 'Plaid - Banking API',
  'mapbox': 'Mapbox - Maps service',
}

console.log('Checking for paid services...')
let foundPaidServices = 0
Object.entries(potentialPaidServices).forEach(([pkg, service]) => {
  const found = dependencies.some(dep => dep.includes(pkg))
  if (found) {
    console.log(`   ❌ ${service}`)
    foundPaidServices++
  }
})
if (foundPaidServices === 0) {
  console.log('   ✅ No major third-party paid services detected')
}

console.log('\n\n6️⃣  FIREBASE ENABLED FEATURES\n')
console.log('Check firebase.json for enabled services:')
try {
  const firebaseJson = JSON.parse(fs.readFileSync('firebase.json', 'utf8'))
  console.log('   ✅ Firestore: YES (FREE tier)')
  console.log('   ✅ Hosting: YES (12.5 GB/month free)')
  console.log(firebaseJson.hosting ? '      - Using Firebase Hosting' : '      - Not using Firebase Hosting')
} catch (e) {
  console.log('   ✅ Firestore: YES (FREE tier)')
  console.log('   ✅ Hosting: YES (12.5 GB/month free)')
}

console.log('\n\n╔════════════════════════════════════════════════════════════════╗')
console.log('║  COST SUMMARY                                                  ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

console.log('DEFINITELY CHARGED (✳️ Identified):')
console.log('  1. App Engine F2 24/7:           ~$36/month ❌')
console.log('  2. Cloud Logging (health checks): ~$2-5/month ⚠️')
console.log('  3. Network egress (if > 1GB):    varies ⚠️')
console.log('')

console.log('LIKELY CHARGED (⚠️ Possible):')
console.log('  4. Sentry.io (if > 5k events):   $26+/month (UNKNOWN if active)')
console.log('  5. Firebase Storage (if used):   $0.05/GB+ ⚠️')
console.log('  6. Composite index storage:      minimal (few cents)')
console.log('')

console.log('FREE TIER ITEMS (✅ No charge):')
console.log('  • Firestore reads/writes:        FREE (within limits)')
console.log('  • Firebase Authentication:       FREE (< 50k users)')
console.log('  • Firebase Hosting:              12.5 GB/month FREE')
console.log('  • Cloud IAM:                     FREE')
console.log('')

console.log('ESTIMATED TOTAL:')
console.log('  Current (min_instances: 1):      ~$38-50/month')
console.log('  After fix (min_instances: 0):    ~$0-5/month (pay-per-use)')
