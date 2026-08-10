import { useCallback, useEffect, useState } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
  setData: (value: T) => void
}

/**
 * 마운트 시 한 번 fetch 하고, reload() 로 다시 불러올 수 있는 최소 훅.
 * deps 가 바뀌면 자동으로 다시 불러온다.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  // fn 은 매 렌더마다 새로 만들어지는 인라인 함수가 대부분이라 deps 에서 제외하고
  // 호출자가 넘긴 deps + reload nonce 로만 재실행을 제어한다.
  const run = useCallback(fn, deps)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    run()
      .then((value) => {
        if (alive) setData(value)
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [run, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { data, loading, error, reload, setData }
}
