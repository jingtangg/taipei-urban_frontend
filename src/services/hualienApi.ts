/**
 * 花蓮縣 API 服務層
 *
 * 獨立於台北 api.ts / urbanApi.ts，使用不同 baseURL（hualien/api）。
 * 設計上刻意保持輕量：只有一個端點 GET /narrow-alleys。
 */

import axios from 'axios'
import type { HualienNarrowAlleyFeatureProps } from '../types/geo'

const hualienClient = axios.create({
  baseURL: import.meta.env.VITE_HUALIEN_API_URL ?? 'http://localhost:8000/hualien/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * 取得花蓮縣窄巷資料
 * @param township - 鄉鎮市區（選填），如 '花蓮市'。不傳則回傳全縣。
 */
export async function getHualienNarrowAlleys(
  township?: string,
  signal?: AbortSignal,
): Promise<HualienNarrowAlleyFeatureProps[]> {
  const resp = await hualienClient.get('/narrow-alleys', {
    params: township ? { township } : {},
    signal,
  })

  const resData = resp.data
  if (!resData.success) throw new Error('獲取花蓮窄巷資料失敗')

  if (resData.data?.type === 'FeatureCollection') {
    return resData.data.features.map(
      (f: { geometry: unknown; properties: Record<string, unknown> }) => ({
        ...f.properties,
        geometry: f.geometry,
      }),
    ) as HualienNarrowAlleyFeatureProps[]
  }

  throw new Error('回傳格式不符預期')
}
