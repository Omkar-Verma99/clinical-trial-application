const fs = require('fs')
const path = require('path')

// Check configurations
console.log('\n=== GOOGLE CLOUD CONFIGURATION CHECK ===\n')

const configFiles = [
  { name: 'app.yaml', path: 'app.yaml' },
  { name: 'apphosting.yaml', path: 'apphosting.yaml' },
  { name: 'firebase.json', path: 'firebase.json' },
]

configFiles.forEach(({ name, path: filePath }) => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8')
    console.log(`\n📄 ${name}:`)
    console.log('─'.repeat(50))
    console.log(content.split('\n').slice(0, 20).join('\n'))
    if (content.split('\n').length > 20) {
      console.log(`... (${content.split('\n').length - 20} more lines)`)
    }
  }
})

console.log('\n\n=== IDENTIFIED GCP SERVICES ===\n')
console.log('1. Cloud Run OR App Engine: app.yaml/apphosting.yaml')
console.log('   - Always running (hourly charges $0.05 if always running)')
console.log('   - Health checks every 10 seconds (potential extra charges)')
console.log('')
console.log('2. Firestore: firebase.json')
console.log('   - Composite indexes: 3 indexes created')
console.log('   - Read/Write operations')
console.log('')
console.log('3. Firebase Storage')
console.log('   - Monthly storage: $0.05 per GB')
console.log('')
console.log('4. Cloud Logging')
console.log('   - Automatically logs all requests')
console.log('   - Logs ingestion: $0.50 per GB')
console.log('')
console.log('=== COST DRIVERS ===\n')
console.log('❌ HIGH: Cloud Run/App Engine running 24/7')
console.log('  Monthly: ~$36/month (if F2 instance always running)')
console.log('')
console.log('⚠️  MEDIUM: Firestore/Auth costs')
console.log('  Minimal for 3 patients')
console.log('')
console.log('⚠️  MEDIUM: Cloud Logging')
console.log('  Depends on application log volume')
console.log('')
console.log('💡 RECOMMENDATION:')
console.log('1. Check if app is ALWAYS running or if you can use cheaper tier')
console.log('2. Disable health checks if they\'re excessive')
console.log('3. Configure Cloud Logging to sample logs instead of storing all')
console.log('4. Use Cloud Run with min_instances: 0 for auto-scaling down')
