import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDAn3llTqhmCmysQ0_lcX79RvuJsQMB2ks",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "kollectcare-rwe-study.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "kollectcare-rwe-study",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "kollectcare-rwe-study.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "940369281340",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:940369281340:web:d6b3f7e8c4a9b2f1e5d8c9a",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-QTWVYF3R19",
};

const email = process.env.E2E_DOCTOR_EMAIL || "omkar.verma@kollectcare.com";
const password = process.env.E2E_DOCTOR_PASSWORD || "KC@123";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function randomCode(i) {
  const n = String(900 + i).padStart(3, "0");
  const suffix = String.fromCharCode(65 + i, 66 + i, 67 + i);
  return `${n}-${suffix}`;
}

function nowIso() {
  return new Date().toISOString();
}

function logResult(results, patientId, step, ok, error = "") {
  results.push({ patientId, step, ok, error });
  const status = ok ? "PASS" : "FAIL";
  console.log(`[${status}] ${patientId} :: ${step}${error ? ` :: ${error}` : ""}`);
}

async function main() {
  const results = [];
  const createdPatientRefs = [];

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    console.log(`Signed in as doctor UID: ${uid}`);

    for (let i = 0; i < 5; i += 1) {
      const patientRef = doc(collection(db, "patients"));
      const patientId = patientRef.id;
      createdPatientRefs.push(patientRef);
      const createdAt = nowIso();
      const code = randomCode(i);

      const createPayload = {
        id: patientId,
        patientId,
        doctorId: uid,
        patientCode: code,
        studySiteCode: "TEST-SITE",
        investigatorName: "Dr Test",
        baselineVisitDate: "2026-03-13",
        age: 45,
        gender: "Male",
        height: 170,
        weight: 70,
        bmi: 24.2,
        durationOfDiabetes: 6,
        baselineGlycemicSeverity: "HbA1c 7.5-8.5%",
        smokingStatus: "Never",
        alcoholIntake: "No",
        physicalActivityLevel: "Moderate",
        diabetesComplications: {
          neuropathy: false,
          retinopathy: false,
          nephropathy: false,
          cadOrStroke: false,
          none: true,
        },
        comorbidities: {
          hypertension: true,
          dyslipidemia: false,
          obesity: false,
          ascvd: false,
          heartFailure: false,
          chronicKidneyDisease: false,
          ckdEgfrCategory: null,
          other: [],
        },
        previousTreatmentType: "Oral drugs only",
        previousDrugClasses: {
          metformin: true,
          sulfonylurea: false,
          dpp4Inhibitor: false,
          sglt2Inhibitor: false,
          tzd: false,
          insulin: false,
          other: [],
        },
        reasonForTripleFDC: {
          inadequateGlycemicControl: true,
          weightConcerns: false,
          hypoglycemiaOnPriorTherapy: false,
          highPillBurden: false,
          poorAdherence: false,
          costConsiderations: false,
          physicianClinicalJudgment: false,
          other: [],
        },
        createdAt,
        updatedAt: createdAt,
      };

      try {
        await setDoc(patientRef, createPayload);
        logResult(results, patientId, "create patient", true);
      } catch (error) {
        logResult(results, patientId, "create patient", false, String(error?.message || error));
        continue;
      }

      try {
        const snap = await getDoc(patientRef);
        const owner = String(snap.data()?.doctorId || "");
        logResult(results, patientId, `owner read doctorId=${owner}`, owner === uid, owner === uid ? "" : `uid=${uid}`);
      } catch (error) {
        logResult(results, patientId, "owner read check", false, String(error?.message || error));
      }

      try {
        await updateDoc(patientRef, {
          updatedAt: nowIso(),
        });
        logResult(results, patientId, "simple update(updatedAt)", true);
      } catch (error) {
        logResult(results, patientId, "simple update(updatedAt)", false, String(error?.message || error));
      }

      try {
        await updateDoc(patientRef, {
          weight: 71 + i,
          baselineVisitDate: "2026-03-14",
          updatedAt: nowIso(),
          "baseline.baselineVisitDate": "2026-03-14",
          "baseline.weight": 71 + i,
          "baseline.updatedAt": nowIso(),
        });
        logResult(results, patientId, "edit patient info + baseline mirror", true);
      } catch (error) {
        logResult(results, patientId, "edit patient info + baseline mirror", false, String(error?.message || error));
      }

      const baselineData = {
        patientId,
        doctorId: uid,
        baselineVisitDate: "2026-03-14",
        hba1c: 7.4,
        fpg: 140,
        ppg: 180,
        weight: 71 + i,
        bloodPressureSystolic: 130,
        bloodPressureDiastolic: 84,
        heartRate: 72,
        serumCreatinine: 1.0,
        egfr: 90,
        urinalysis: "Normal",
        dosePrescribed: "Empagliflozin 25mg + Sitagliptin 100mg + Metformin 1000mg",
        treatmentInitiationDate: "2026-03-14",
        counseling: {
          dietAndLifestyle: true,
          hypoglycemiaAwareness: true,
          utiGenitialInfectionAwareness: true,
          hydrationAdvice: true,
        },
        dietAdvice: true,
        counselingProvided: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      try {
        await setDoc(
          patientRef,
          {
            baseline: baselineData,
            baselineVisitDate: "2026-03-14",
            updatedAt: nowIso(),
          },
          { merge: true }
        );
        logResult(results, patientId, "save baseline", true);
      } catch (error) {
        logResult(results, patientId, "save baseline", false, String(error?.message || error));
      }

      const followupData = {
        patientId,
        doctorId: uid,
        visitNumber: 12,
        visitDate: "2026-06-13",
        hba1c: 6.9,
        fpg: 122,
        ppg: 165,
        weight: 70 + i,
        bloodPressureSystolic: 126,
        bloodPressureDiastolic: 82,
        urinalysis: "Normal",
        glycemicResponse: {
          category: "Responder",
          hba1cChange: -0.5,
          hba1cPercentageChange: -6.7,
        },
        outcomes: {
          weightChange: "Neutral",
          bpControlAchieved: true,
          renalOutcome: "Stable eGFR",
        },
        adherence: {
          patientContinuingTreatment: true,
          addOnOrChangedTherapy: false,
          missedDosesInLast7Days: 0,
        },
        adverseEventsPresent: false,
        eventsOfSpecialInterest: {
          hypoglycemiaMild: false,
          hypoglycemiaModerate: false,
          hypoglycemiaSevere: false,
          uti: false,
          genitalMycoticInfection: false,
          dizzinessDehydrationSymptoms: false,
          hospitalizationOrErVisit: false,
        },
        physicianAssessment: {
          overallEfficacy: "Good",
          overallTolerability: "Good",
          complianceJudgment: "Good",
          preferKcMeSempaForLongTerm: true,
          preferredPatientProfiles: {
            uncontrolledT2dm: true,
            obeseT2dm: false,
            ckdPatients: false,
            htnPlusT2dm: false,
            elderlyPatients: false,
          },
        },
        dataPrivacy: {
          noPersonalIdentifiersRecorded: true,
          dataCollectedAsRoutineClinicalPractice: true,
          patientIdentityMappingAtClinicOnly: true,
        },
        physicianDeclaration: {
          physicianName: "Dr Test",
          qualification: "MD",
          clinicHospitalName: "TEST-SITE",
          confirmationCheckbox: true,
          signatureMethod: "Checkbox",
          signatureDate: "2026-06-13",
        },
        comments: "Automated e2e test",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      try {
        await updateDoc(patientRef, {
          followups: arrayUnion(followupData),
          updatedAt: nowIso(),
        });
        logResult(results, patientId, "save follow-up", true);
      } catch (error) {
        logResult(results, patientId, "save follow-up", false, String(error?.message || error));
      }
    }

    const failed = results.filter((r) => !r.ok);
    console.log("\n=== SUMMARY ===");
    console.log(`Total checks: ${results.length}`);
    console.log(`Passed: ${results.length - failed.length}`);
    console.log(`Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log("\nFailed checks:");
      for (const item of failed) {
        console.log(`- ${item.patientId} :: ${item.step} :: ${item.error}`);
      }
      process.exitCode = 1;
    }

    // Optional cleanup: keep false by default to preserve test evidence.
    const CLEANUP = false;
    if (CLEANUP) {
      for (const ref of createdPatientRefs) {
        try {
          await deleteDoc(ref);
          console.log(`[CLEANUP] deleted ${ref.id}`);
        } catch (error) {
          console.log(`[CLEANUP-FAIL] ${ref.id} :: ${String(error?.message || error)}`);
        }
      }
    }
  } catch (error) {
    console.error("E2E script failed:", error);
    process.exitCode = 1;
  } finally {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
  }
}

await main();
