/**
 * hooks/useApi.ts — React 版的 fetchAndSet
 * 對應 publicMixin.js: fetchAndSet (L103-117)
 *
 * Vue fetchAndSet 直接改 this[listField]，React 改成回傳 { data, loading, error }
 * 呼叫方用 execute() 觸發，與 fetchAndSet 的主動呼叫邏輯一致
 *
 * ⚠️  queryFn 若依賴外部變數，呼叫端要用 useCallback 包住，
 *     否則 execute 會在每次 render 重建。
 *     例：useApi(useCallback(() => getRoads(district), [district]))
 */

import { useState, useCallback } from 'react'

interface UseApiState<T> {
  data: T[]
  loading: boolean
  error: string | null
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: () => Promise<void>
}

export function useApi<T>(
  queryFn: () => Promise<T[]>,
  emptyMsg = '查無資料',
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: [],
    loading: false,
    error: null,
  })

  // 對應 fetchAndSet 的完整流程：try → set data / catch → set error
  const execute = useCallback(async () => {
    setState((s: UseApiState<T>) => ({ ...s, loading: true, error: null }))
    try {
      const result = await queryFn()
      if (!result.length) {
        setState({ data: [], loading: false, error: emptyMsg })
      } else {
        setState({ data: result, loading: false, error: null })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : emptyMsg
      setState({ data: [], loading: false, error: msg })
    }
  }, [queryFn, emptyMsg])

  return { ...state, execute }
}
