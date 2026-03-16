/**
 * services/api.ts — 底層 HTTP 工具
 * 對應 publicMixin.js: dataQuery (L77-101)
 * axios interceptor 對應 logoutClick 裡的 Authorization header 手法
 */

import axios from 'axios'

// Laravel 回傳格式（對應 publicMixin.js:77-95 的 resData 解構邏輯）
// 放在 api.ts 是對的 — 這是 HTTP 層的實作細節，不是地理領域型別
interface ApiResponse<T> {
  success: boolean
  data: { tableList: T[] }
  errMsg?: string
}

// 對應 publicMixin.js chekcIP() 的 URL 切換邏輯，改用 Vite 環境變數
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

const client = axios.create({ baseURL: BASE_URL })

// Bearer token interceptor（對應 logoutClick 裡的 Authorization header）
client.interceptors.request.use(config => {
  const raw = localStorage.getItem('user')
  const token = raw ? JSON.parse(raw)?.data?.token : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ★ 直接對應 dataQuery (publicMixin.js:75-101)
export async function dataQuery<T>(
  url: string,
  params: object,
  errorMsg: string,
  method: 'POST' | 'GET' = 'POST',
): Promise<T[]> {
  const response = method === 'GET'
    ? await client.get<ApiResponse<T>>(url, { params })
    : await client.post<ApiResponse<T>>(url, params)

  const resData = response.data
  if (resData.success) {
    const list = resData.data?.tableList
    return Array.isArray(list) ? list : []
  }
  throw new Error(resData.errMsg ?? errorMsg)
}
