/**
 * HTTP 客戶端基礎層
 *
 * 職責:
 * - 提供與 Laravel 後端溝通的底層 HTTP 工具
 * - 統一處理 API 回傳格式與錯誤處理邏輯
 * - 區分開發環境與正式環境的錯誤顯示方式
 *
 * 設計模式:
 * - 所有 API 都透過 dataQuery 統一處理,確保錯誤訊息一致性
 * - 開發環境顯示詳細錯誤於 console,正式環境只顯示友善訊息
 */

import axios from 'axios'

/**
 * Laravel API 標準回傳格式
 * 後端統一使用此格式包裝所有資料回應
 */
interface ApiResponse<T> {
  success: boolean
  data: { tableList: T[] }
  errMsg?: string
}


export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/taipei/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 通用 API 查詢函數
 * 自動適配 tableList 格式（一般列表 API）和完整 data 格式（如 GeoJSON）
 *
 * @template T - 回傳資料的型別（可以是陣列或物件）
 * @param url - API 端點路徑，例如 '/districts' 或 '/roads'
 * @param params - 請求參數物件，GET 時轉為 query string，POST 時放在 body
 * @param errorMsg - 統一的錯誤訊息，避免暴露系統細節給使用者
 * @param method - HTTP 方法，預設 GET
 * @returns Promise<T> 成功時回傳型別安全的資料
 * @throws Error 失敗時拋出包含 errorMsg 的錯誤
 *
 * 錯誤處理策略:
 * - 開發環境: console.error 顯示詳細錯誤，方便除錯
 * - 正式環境: 只拋出 errorMsg，保護系統資訊安全
 *
 * 自動判斷邏輯:
 * - 如果 response.data.data.tableList 存在 → 回傳 tableList
 * - 否則 → 回傳整個 response.data.data
 */
export async function apiQuery<T>(
  url: string,
  params: object = {},
  errorMsg: string,
  method: 'POST' | 'GET' = 'GET',
): Promise<T> {
  try {
    const response = method === 'GET'
      ? await client.get(url, { params })
      : await client.post(url, params)

    const resData = response.data

    if (resData.success) {
      // 自動適配：有 tableList 就回傳 tableList，否則回傳整個 data
      return resData.data.tableList ?? resData.data
    }

    throw new Error(errorMsg)
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('詳細錯誤:', error)
    }
    throw new Error(errorMsg || '系統發生錯誤')
  }
}
