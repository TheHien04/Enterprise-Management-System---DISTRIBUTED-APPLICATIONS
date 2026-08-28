import { useEffect, useState } from 'react'

export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const run = async () => {
    setLoading(true)
    try {
      const result = await loader()
      setData(result)
      setError(null)
      return result
    } catch (err) {
      setError((err as Error).message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error, loading, reload: run }
}
