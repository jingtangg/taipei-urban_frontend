/**
 * 道路與窄巷圖層樣式定義
 *
 * 職責:
 * - 集中管理消防局實測窄巷與都市計畫道路的 OL Style 物件
 * - 顏色條件統一引用 riskThresholds 常數，修改門檻只需改一處
 */

import { Style, Stroke } from 'ol/style'
import type { FeatureLike } from 'ol/Feature'
import { RISK_THRESHOLD_EXTREME } from '../constants/riskThresholds'

/**
 * 消防局實測窄巷樣式（實線）
 * - 極高風險 (< 3.5m)：紅色
 * - 高風險 (3.5–6m)：黃色
 */
export function narrowAlleyStyle(feature: FeatureLike): Style[] {
  const color = feature.get('width_m') < RISK_THRESHOLD_EXTREME
    ? 'rgba(252, 33, 33, 0.94)'
    : 'rgba(255, 170, 0, 0.92)'
  return [
    new Style({ stroke: new Stroke({ color: 'rgba(8, 12, 10, 0.62)', width: 4.2 }) }),
    new Style({ stroke: new Stroke({ color, width: 3 }) }),
  ]
}

/**
 * 都市計畫道路樣式（虛線底圖）
 * - 極高風險 (< 3.5m)：粉紅色
 * - 高風險 (3.5–6m)：淡黃色
 */
export function roadStyle(feature: FeatureLike): Style[] {
  const color = feature.get('width_m') < RISK_THRESHOLD_EXTREME
    ? 'rgba(254, 174, 218, 0.72)'
    : 'rgba(255, 248, 115, 0.68)'
  return [
    new Style({ stroke: new Stroke({ color: 'rgba(8, 12, 10, 0.55)', width: 3.6, lineDash: [8, 5] }) }),
    new Style({ stroke: new Stroke({ color, width: 2.5, lineDash: [8, 5] }) }),
  ]
}
