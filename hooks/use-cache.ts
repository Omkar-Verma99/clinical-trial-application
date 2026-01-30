import { useEffect, useState, useCallback, useRef } from "react"

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

const cache = new Map<string, CacheEntry<any>>()

export function useCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 5 minutes default
): { data: T | null; loading: boolean; error: Error | null; refetch: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    // ✅ Check if component is still mounted
    if (!mountedRef.current) return

    // Check cache first
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      if (mountedRef.current) {
        setData(cached.data)
        setLoading(false)
      }
      return
    }

    try {
      setLoading(true)
      const result = await fetchFn()
      
      // ✅ Only update state if still mounted
      if (mountedRef.current) {
        setData(result)
        setError(null)

        // Store in cache
        cache.set(key, {
          data: result,
          timestamp: Date.now(),
          ttl,
        })
      }
    } catch (err) {
      // ✅ Only update state if still mounted
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)))
        setData(null)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [key, fetchFn, ttl])

  // ✅ FIX: Run once on mount only, not on every fetchData change
  useEffect(() => {
    fetchData()
  }, [key, fetchFn, ttl])  // Dependencies are stable primitives/functions, not fetchData itself

  // ✅ FIX: Cleanup on unmount to prevent setState on unmounted component
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  return { data, loading, error, refetch: fetchData }
}

export function clearCache(key?: string) {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}
