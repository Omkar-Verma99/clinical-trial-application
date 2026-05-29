import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const path = join(__dirname, "output", "patient-validation-audit-20260529.csv")
const text = readFileSync(path, "utf8").trim()
const lines = text.split(/\r?\n/)

function parseCsvLine(line) {
  const out = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      out.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

const headers = parseCsvLine(lines[0])
const rows = lines.slice(1).map((line) => {
  const vals = parseCsvLine(line)
  return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]))
})

const dataCompleteBoth = rows.filter(
  (r) => r.patientInfo_data_complete === "true" && r.baseline_data_complete === "true"
)
const onlyResaveFlags = dataCompleteBoth.filter(
  (r) => r.patientInfoComplete_flag === "false" || r.baselineComplete_flag === "false"
)
const canSave = rows.filter((r) => r.can_save_followup_per_rules === "true")
const blocked = rows.filter((r) => r.can_save_followup_per_rules === "false")

function countMissing(fieldName, filterFn) {
  const counts = {}
  for (const r of rows.filter(filterFn)) {
    for (const f of (r[fieldName] || "").split(";").map((s) => s.trim()).filter(Boolean)) {
      counts[f] = (counts[f] || 0) + 1
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

console.log(JSON.stringify({
  total: rows.length,
  patientInfoDataIncomplete: rows.filter((r) => r.patientInfo_data_complete === "false").length,
  baselineDataIncomplete: rows.filter((r) => r.baseline_data_complete === "false").length,
  bothDataComplete: dataCompleteBoth.length,
  onlyNeedFlagResave: onlyResaveFlags.length,
  canSaveFollowupNow: canSave.length,
  blockedFollowupSave: blocked.length,
  stubBaseline: rows.filter((r) => r.baseline_is_stub_only === "true").length,
  hasFollowups: rows.filter((r) => Number(r.followup_count) > 0).length,
  topPatientInfoMissing: countMissing("patientInfo_missing_fields", (r) => r.patientInfo_data_complete === "false").slice(0, 15),
  topBaselineMissing: countMissing("baseline_missing_fields", (r) => r.baseline_data_complete === "false").slice(0, 15),
}, null, 2))
