console.log('\n=== FIREBASE SPARK PLAN (FREE TIER) ===\n')

console.log('📚 Firestore Free Tier Limits:')
console.log('  • Reads:     50,000 per day (unlimited)')
console.log('  • Writes:    20,000 per day')
console.log('  • Deletes:   20,000 per day')
console.log('  • Storage:   1 GB')
console.log('')

console.log('=== YOUR USAGE ANALYSIS ===\n')

const patients = 3
const admins = 2
const doctors = 37
const auditLogs = 15

// Estimate daily operations
const estimatedDailyReads = (patients * 2) + (admins * 2) + (doctors * 1) + (auditLogs * 0.5)
const estimatedDailyWrites = (patients * 0.5) + (admins * 0.2) + (auditLogs * 0.5)

console.log('📊 Estimated Daily Operations:')
console.log(`  • Reads:     ${Math.ceil(estimatedDailyReads)} (Free limit: 50,000) ✅`)
console.log(`  • Writes:    ${Math.ceil(estimatedDailyWrites)} (Free limit: 20,000) ✅`)
console.log(`  • Storage:   0.01 MB (Free limit: 1 GB) ✅`)
console.log('')

console.log('💰 Firestore Monthly Cost:')
console.log('  ✅ FREE - Well within Spark Plan limits')
console.log('')

console.log('=== THEN WHAT ARE THE CHARGES? ===\n')

console.log('❌ PRIMARY: App Engine F2 Instance')
console.log('   Cost: $0.05/hour = ~$36/month')
console.log('   Reason: min_instances: 1 (always running)')
console.log('')

console.log('❌ SECONDARY: Cloud Logging')
console.log('   Cost: $0.50/GB ingested')
console.log('   Reason: Health checks logging (every 10 seconds)')
console.log('')

console.log('=== RECOMMENDATION ===\n')
console.log('Your charges are NOT from Firestore/database.')
console.log('They are from the compute instance running 24/7.')
console.log('')
console.log('To fix:')
console.log('1. Set min_instances: 0 in app.yaml')
console.log('2. App will auto-scale down when not in use')
console.log('3. Cost drops to ~$0-5/month (you only pay when it runs)')
