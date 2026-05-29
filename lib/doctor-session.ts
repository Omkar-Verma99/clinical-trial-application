/** Client-side doctor session cookies used by middleware. */
export function hasDoctorSessionCookies(): boolean {
  if (typeof document === "undefined") return false
  const cookie = document.cookie || ""
  return cookie.includes("doctorAuth=true") && cookie.includes("appRole=doctor")
}
