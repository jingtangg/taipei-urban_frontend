/**
 * 風險等級說明文字（前端顯示用）
 *
 * 風險分級判斷邏輯（3.5m / 6m 閾值）已移至後端 BaseController::calculateRiskLevel()
 * 前端僅負責將後端回傳的 risk_level 字串對應至 UI 說明文字
 */
export const RISK_DESC: Record<string, string> = {
  '極高風險': '消防車無法通行',
  '高風險':   '通行受限',
  '一般':     '正常通行',
}
