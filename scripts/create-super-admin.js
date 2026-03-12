const fs = require('fs')
const path = require('path')
const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')

const ALL_ADMIN_PERMISSIONS = [
  'view_doctors',
  'view_patients',
  'view_forms',
  'export_data',
  'view_analytics',
  'manage_admins',
  'view_audit_logs',
  'change_settings',
  'delete_data',
  'manage_roles',
]

function parseArgs(argv) {
  const out = {}
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i]
    const next = argv[i + 1]
    if (!key.startsWith('--')) continue
    out[key.slice(2)] = next && !next.startsWith('--') ? next : 'true'
  }
  return out
}

function loadServiceAccountFromEnvFile(envPath) {
  const envText = fs.readFileSync(envPath, 'utf8')
  const match = envText.match(/^FIREBASE_SERVICE_ACCOUNT_KEY=(.*)$/m)
  if (!match) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local')
  return JSON.parse(match[1].trim())
}

function makePassword(length = 16) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%'
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += alphabet.charAt(Math.floor(Math.random() * alphabet.length))
  }
  return out
}

async function main() {
  const args = parseArgs(process.argv)
  const email = String(args.email || '').trim().toLowerCase()
  const firstName = String(args.first || '').trim()
  const lastName = String(args.last || '').trim()

  if (!email || !firstName || !lastName) {
    throw new Error('Usage: node scripts/create-super-admin.js --email <email> --first <firstName> --last <lastName>')
  }

  const root = path.resolve(__dirname, '..')
  const envPath = path.join(root, '.env.local')
  const serviceAccount = loadServiceAccountFromEnvFile(envPath)

  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) })
  }

  const auth = getAuth()
  const db = getFirestore()

  let uid = ''
  let generatedPassword = null
  let created = false

  try {
    const existing = await auth.getUserByEmail(email)
    uid = existing.uid
  } catch {
    const password = makePassword()
    const createdUser = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      disabled: false,
    })
    uid = createdUser.uid
    generatedPassword = password
    created = true
  }

  const now = new Date()

  await db.collection('admins').doc(uid).set(
    {
      email,
      firstName,
      lastName,
      role: 'super_admin',
      status: 'active',
      permissions: ALL_ADMIN_PERMISSIONS,
      loginCount: 0,
      createdAt: now,
      updatedAt: now,
      lastLogin: null,
    },
    { merge: true }
  )

  const userRecord = await auth.getUser(uid)
  const existingClaims = userRecord.customClaims || {}
  await auth.setCustomUserClaims(uid, {
    ...existingClaims,
    role: 'super_admin',
  })

  await auth.updateUser(uid, {
    displayName: `${firstName} ${lastName}`,
    disabled: false,
  })

  console.log(`SUPER_ADMIN_READY uid=${uid} email=${email} created=${created}`)
  if (generatedPassword) {
    console.log(`SUPER_ADMIN_TEMP_PASSWORD ${generatedPassword}`)
  }
}

main().catch((error) => {
  console.error('SUPER_ADMIN_SETUP_FAILED', error.message)
  process.exit(1)
})
