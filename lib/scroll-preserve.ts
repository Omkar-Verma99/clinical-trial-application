/** Preserve window scroll position across state updates that re-render the page. */
export function preserveScrollPosition(action: () => void): void {
  if (typeof window === "undefined") {
    action()
    return
  }

  const scrollY = window.scrollY
  action()
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, left: 0, behavior: "auto" })
    })
  })
}
