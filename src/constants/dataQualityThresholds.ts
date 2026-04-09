/**
 * 資料品質警示門檻值
 *
 * 用於判斷消防局實測窄巷與都市計畫值之間的偏差程度：
 * - 路寬偏移：實測寬度 vs 計畫路寬的差值
 * - 定位偏移：實測位置與計畫路線的貼齊距離
 *
 * 所有用到這些數字的地方（popup 警示、圖例說明）統一引用這裡
 */
export const WARN_WIDTH_HIGH    = 30  // 路寬偏移極高警示 (m)
export const WARN_WIDTH_MID     = 8   // 路寬偏移中警示 (m)
export const WARN_DISTANCE_HIGH = 50  // 定位偏移極高警示 (m)
export const WARN_DISTANCE_MID  = 30  // 定位偏移中警示 (m)
