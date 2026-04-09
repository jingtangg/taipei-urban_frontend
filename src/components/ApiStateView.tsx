import React from 'react'

interface ApiStateViewProps<T> {
  data: T
  error: string | null
  loading?: boolean
  children: (data: NonNullable<T>) => React.ReactNode
}

export function ApiStateView<T>({ data, error, loading, children }: ApiStateViewProps<T>) {
  if (error) return (
    <div className="p-2 border border-[#ff4444]/30 bg-[#ff4444]/5 text-[10px] text-[#ff4444]/80">
      ERR: {error}
    </div>
  )
  const isEmpty = data === null || (Array.isArray(data) && (data as unknown[]).length === 0)
  if (loading || isEmpty) return (
    <div className="p-2 border border-[#00ff41]/20 bg-[#00ff41]/5 text-[10px] opacity-60">
      載入中...
    </div>
  )
  return <>{children(data as NonNullable<T>)}</>
}
