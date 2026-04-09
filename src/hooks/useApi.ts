import { useState, useEffect } from 'react'

/**
 * 通用 API 資料擷取 Hook
 *
 * @param queryFn    - 回傳 Promise 的查詢函式；引用變更時自動重新 fetch
 * @param initialData - 資料初始值（陣列傳 []，單物件傳 null）
 * @returns { data, loading, error }
 *
 * @example
 * // 固定查詢（不需要 deps）
 * const { data: districts } = useApi(getDistrictMetadata, [])
 *
 * // 依賴參數查詢（用 useCallback 包裹讓引用跟著 deps 更新）
 * const fn = useCallback(() => getNarrowAlleyStatistics(district), [district])
 * const { data: stats } = useApi(fn, null)
 */
export function useApi<T>(
  queryFn: () => Promise<T>,
  initialData: T,
): { data: T; loading: boolean; error: string | null } {
  const [data, setData]       = useState<T>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    queryFn()
      .then(result  => { if (!cancelled) setData(result) })
      .catch(err    => { if (!cancelled) setError(err?.message ?? '請求失敗') })
      .finally(()   => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [queryFn])

  return { data, loading, error }
}
