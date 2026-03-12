import { getFirebaseAdminDb } from '@/lib/firebase-admin'
import {
  DEFAULT_CLINICAL_VALIDATION_RANGES,
  normalizeClinicalValidationRanges,
} from '@/lib/clinical-ranges'

export async function GET() {
  try {
    const db = getFirebaseAdminDb()
    const configDoc = await db.collection('adminPanel').doc('clinicalValidationRanges').get()
    const data = configDoc.exists ? configDoc.data() || {} : {}

    const ranges = normalizeClinicalValidationRanges(data.ranges)
    const updatedAt = data.updatedAt?.toDate?.()?.toISOString?.() || null

    return Response.json({
      success: true,
      ranges: ranges || DEFAULT_CLINICAL_VALIDATION_RANGES,
      updatedAt,
    })
  } catch (error) {
    console.error('Clinical ranges GET error:', error)
    return Response.json(
      {
        success: true,
        ranges: DEFAULT_CLINICAL_VALIDATION_RANGES,
        updatedAt: null,
      },
      { status: 200 }
    )
  }
}
