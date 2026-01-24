import { useEffect, useState, useCallback } from "react"

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

  const fetchData = useCallback(async () => {
    // Check cache first
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      setData(cached.data)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const result = await fetchFn()
      setData(result)
      setError(null)

      // Store in cache
      cache.set(key, {
        data: result,
        timestamp: Date.now(),
        ttl,
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [key, fetchFn, ttl])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

export function clearCache(key?: string) {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}
