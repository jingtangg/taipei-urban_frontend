/**
 * 底層 HTTP 工具
 * 統一處理 Laravel API 呼叫與錯誤訊息
 */

import axios from 'axios'

// Laravel API 回傳格式
interface ApiResponse<T> {
  success: boolean
  data: { tableList: T[] }
  errMsg?: string
}

const client = axios.create({
  baseURL: 'http://127.0.0.1:8000'
})

// 通用 API 查詢，只回傳資料或拋出通用錯誤訊息
export async function dataQuery<T>(
  url: string,
  params: object,
  errorMsg: string,
  method: 'POST' | 'GET' = 'POST',
): Promise<T[]> {
  try {
    const response = method === 'GET'
      ? await client.get<ApiResponse<T>>(url, { params })
      : await client.post<ApiResponse<T>>(url, params)

    const resData = response.data
    if (resData.success) {
      const list = resData.data?.tableList
      return Array.isArray(list) ? list : []
    }
    throw new Error(errorMsg)
  } catch (error: any) {
    throw new Error(errorMsg || '系統發生錯誤')
  }
}
