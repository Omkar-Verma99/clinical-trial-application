import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, writeBatch } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDAn3llTqhmCmysQ0_lcX79RvuJsQMB2ks',
  authDomain: 'kollectcare-rwe-study.firebaseapp.com',
  projectId: 'kollectcare-rwe-study',
  storageBucket: 'kollectcare-rwe-study.firebasestorage.app',
  messagingSenderId: '940369281340',
  appId: '1:940369281340:web:d6b3f7e8c4a9b2f1e5d8c9a',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const email = 'e2e.demo.doctor.20260529@kollectcare.test'
const password = 'E2eTest@2026!'
const patientId = 'rxo2nilK7XGBzeyisfKH'

const cred = await signInWithEmailAndPassword(auth, email, password)
console.log('signed in', cred.user.uid)

const data = {
  patientId,
  doctorId: cred.user.uid,
  baselineVisitDate: '2026-03-15',
  hba1c: 7.8,
  fpg: 140,
  ppg: 180,
  weight: 72,
  bloodPressureSystolic: 130,
  bloodPressureDiastolic: 85,
  heartRate: 72,
  serumCreatinine: 1.0,
  egfr: 90,
  urinalysis: 'Normal',
  dosePrescribed: 'Empagliflozin 10mg + Sitagliptin Phosphate Monohydrate 100mg + Metformin hydrochloride Ip 1000mg',
  treatmentInitiationDate: '2026-03-15',
  counseling: { dietAndLifestyle: true, hypoglycemiaAwareness: false, utiGenitialInfectionAwareness: false, hydrationAdvice: false },
  counselingProvided: true,
  dietAdvice: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

try {
  const batch = writeBatch(db)
  batch.set(
    doc(db, 'patients', patientId),
    { baseline: data, baselineComplete: true, baselineVisitDate: '2026-03-15', updatedAt: new Date().toISOString() },
    { merge: true }
  )
  await batch.commit()
  console.log('SUCCESS: baseline saved')
} catch (e) {
  console.error('FAILED:', e.code, e.message)
}
