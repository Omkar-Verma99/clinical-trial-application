"use client"

import { useEffect } from "react"

/** Prevent the document body from scrolling; inner panes handle overflow. */
export function useLockViewportScroll(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return

    const html = document.documentElement
    const body = document.body

    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const prevHtmlHeight = html.style.height
    const prevBodyHeight = body.style.height

    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    html.style.height = "100dvh"
    body.style.height = "100dvh"

    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      html.style.height = prevHtmlHeight
      body.style.height = prevBodyHeight
    }
  }, [enabled])
}
