/**
 * 窄巷風險分級工具函式
 *
 * 職責:
 * - 將路寬數值轉換為風險等級文字與描述
 * - 供地圖 popup 與統計元件統一呼叫，避免重複邏輯
 */

import { RISK_THRESHOLD_EXTREME, RISK_THRESHOLD_HIGH } from '../constants/riskThresholds'

export interface RiskInfo {
  level: string  // '極高風險' | '高風險' | '一般'
  desc:  string  // 對應的說明文字
}

/**
 * 依路寬計算風險等級
 * @param widthM - 路寬（公尺）
 */
export function getRiskInfo(widthM: number): RiskInfo {
  if (widthM < RISK_THRESHOLD_EXTREME) return { level: '極高風險', desc: '消防車無法通行' }
  if (widthM < RISK_THRESHOLD_HIGH)    return { level: '高風險',   desc: '通行受限' }
  return                                      { level: '一般',     desc: '正常通行' }
}
