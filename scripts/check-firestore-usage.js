const fs = require('fs')
const path = require('path')
const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

function loadServiceAccountFromEnvFile(envPath) {
  const envText = fs.readFileSync(envPath, 'utf8')
  const match = envText.match(/^FIREBASE_SERVICE_ACCOUNT_KEY=(.*)$/m)
  if (!match) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local')
  }

  const raw = match[1].trim()
  return JSON.parse(raw)
}

async function main() {
  try {
    const root = path.resolve(__dirname, '..')
    const envPath = path.join(root, '.env.local')

    const serviceAccount = loadServiceAccountFromEnvFile(envPath)
    if (!getApps().length) {
      initializeApp({ credential: cert(serviceAccount) })
    }

    const db = getFirestore()

    console.log('\n=== FIRESTORE USAGE ANALYSIS ===\n')

    // Count patients
    const patientsSnap = await db.collection('patients').get()
    console.log(`✓ Total Patients: ${patientsSnap.docs.length}`)
    console.log(`  Read Operations: ${patientsSnap.docs.length}`)

    // Count admins
    const adminsSnap = await db.collection('admins').get()
    console.log(`\n✓ Total Admins: ${adminsSnap.docs.length}`)
    console.log(`  Read Operations: ${adminsSnap.docs.length}`)

    // Count doctors
    const doctorsSnap = await db.collection('doctors').get()
    console.log(`\n✓ Total Doctors: ${doctorsSnap.docs.length}`)
    console.log(`  Read Operations: ${doctorsSnap.docs.length}`)

    // Analyze patient data size
    let totalPatientBytes = 0
    let patientDocsWithBaseline = 0
    let totalFollowups = 0
    
    patientsSnap.docs.forEach(doc => {
      const docSize = JSON.stringify(doc.data()).length
      totalPatientBytes += docSize
      const data = doc.data()
      if (data.baseline) patientDocsWithBaseline++
      if (Array.isArray(data.followups)) totalFollowups += data.followups.length
    })

    console.log(`\n✓ Patient Data:`)
    console.log(`  Documents with Baseline: ${patientDocsWithBaseline}`)
    console.log(`  Total Follow-ups: ${totalFollowups}`)
    console.log(`  Total Data Size: ${(totalPatientBytes / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  Avg Document Size: ${(totalPatientBytes / patientsSnap.docs.length / 1024).toFixed(2)} KB`)

    // Check audit logs
    const auditSnap = await db.collection('auditLogs').get()
    console.log(`\n✓ Audit Logs: ${auditSnap.docs.length}`)
    console.log(`  Read Operations: ${auditSnap.docs.length}`)

    // Count all collections
    console.log(`\n=== ALL COLLECTIONS ===`)
    const collections = await db.listCollections()
    let totalDocs = 0
    let totalReads = patientsSnap.docs.length + adminsSnap.docs.length + doctorsSnap.docs.length + auditSnap.docs.length

    for (const collectionRef of collections) {
      const snap = await collectionRef.get()
      console.log(`${collectionRef.id}: ${snap.docs.length} documents`)
      totalDocs += snap.docs.length
      totalReads += snap.docs.length
    }

    console.log(`\n=== COST ESTIMATE ===`)
    console.log(`Total Documents: ${totalDocs}`)
    console.log(`Total Read Operations (collection scans): ${totalReads}`)
    console.log(`Firestore Read Cost (USA): $0.06 per 100,000 reads`)
    console.log(`Estimated Cost: $${((totalReads / 100000) * 0.06).toFixed(4)} per full scan`)
    console.log(`\nIf this script runs:`)
    console.log(`  - Daily: $${((totalReads / 100000) * 0.06 * 30).toFixed(2)}/month`)
    console.log(`  - Hourly: $${((totalReads / 100000) * 0.06 * 24 * 30).toFixed(2)}/month`)
    console.log(`  - Every 5 mins: $${((totalReads / 100000) * 0.06 * 288 * 30).toFixed(2)}/month`)

    process.exit(0)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
