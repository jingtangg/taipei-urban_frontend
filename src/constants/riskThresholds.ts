/**
 * 窄巷風險分級門檻值
 *
 * 依據消防法規定義：
 * - 極高風險：< 3.5m，消防車無法通行
 * - 高風險：3.5–6m，通行受限
 * - 一般：≥ 6m，正常通行
 *
 * 所有用到 3.5 / 6 的地方（樣式、popup、資料篩選）統一引用這裡
 */
export const RISK_THRESHOLD_EXTREME = 3.5  // 極高風險上限 (m)
export const RISK_THRESHOLD_HIGH    = 6    // 高風險上限 (m)
