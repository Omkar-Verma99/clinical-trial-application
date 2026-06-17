import { areAllFollowUpsComplete } from "@/lib/followup-validation"
import { getFollowUpFirestoreGuardIssues } from "@/lib/firestore-guards"
import { getAuthorizedDoctor } from "@/lib/doctor-api-auth"
import type { FollowUpData, Patient } from "@/lib/types"

export const dynamic = "force-dynamic"

/** Merge-only follow-up save for doctors (same validation as admin API; bypasses client rules). */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ patientId: string }> }
) {
  const authResult = await getAuthorizedDoctor(request)
  if (!authResult.ok) return authResult.response

  const { patientId } = await context.params
  if (!patientId) {
    return Response.json({ success: false, error: "Patient ID is required" }, { status: 400 })
  }

  let body: { followups?: FollowUpData[] }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const followups = body.followups
  if (!Array.isArray(followups)) {
    return Response.json({ success: false, error: "followups array is required" }, { status: 400 })
  }

  if (!areAllFollowUpsComplete(followups)) {
    return Response.json(
      { success: false, error: "Follow-up data is incomplete. Complete all required fields." },
      { status: 400 }
    )
  }

  const db = authResult.db
  const patientRef = db.collection("patients").doc(patientId)
  const patientSnap = await patientRef.get()

  if (!patientSnap.exists) {
    return Response.json({ success: false, error: "Patient not found" }, { status: 404 })
  }

  const patientData = { id: patientSnap.id, ...patientSnap.data() } as Patient
  if (patientData.doctorId !== authResult.doctorId) {
    return Response.json(
      { success: false, error: "You can only update follow-ups for your own patients." },
      { status: 403 }
    )
  }

  const guardIssues = getFollowUpFirestoreGuardIssues(patientData, followups)
  if (guardIssues.length > 0) {
    return Response.json({ success: false, error: guardIssues.join(" ") }, { status: 400 })
  }

  await patientRef.set(
    {
      followups,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )

  return Response.json({ success: true })
}
