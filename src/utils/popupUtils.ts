/**
 * Popup HTML 工具函式
 *
 * 職責:
 * - 產生 terminal 風格的 popup HTML 字串（供 OL Overlay innerHTML 使用）
 * - 計算資料品質警示徽章（路寬偏移 / 定位偏移）
 *
 * 注意:
 * 這些函式產生原始 HTML 字串而非 React JSX，
 * 因為 OL Overlay 透過 innerHTML 注入，無法使用 React render。
 */

import { COLOR_DANGER, COLOR_WARNING } from '../constants/colors'
import {
  WARN_WIDTH_HIGH,
  WARN_WIDTH_MID,
  WARN_DISTANCE_HIGH,
  WARN_DISTANCE_MID,
} from '../constants/dataQualityThresholds'

// ========== 警示徽章 HTML 字串 ==========
const BADGE_BASE = `display:inline-block;width:14px;height:14px;line-height:13px;text-align:center;border-radius:9999px;font-size:9px;font-weight:bold;vertical-align:middle`

const HIGH_WARN_BADGE = `<span style="${BADGE_BASE};border:1px solid ${COLOR_DANGER};color:${COLOR_DANGER};box-shadow:0 0 5px ${COLOR_DANGER}66">!!</span>`
const MID_WARN_BADGE  = `<span style="${BADGE_BASE};border:1px solid ${COLOR_WARNING};color:${COLOR_WARNING};box-shadow:0 0 5px ${COLOR_WARNING}66">!</span>`

// ========== Popup 模板 ==========

/**
 * 產生 terminal 風格 popup HTML
 * @param headerColor  - header 文字顏色（hex 字串）
 * @param title        - header 標題
 * @param bodyContent  - body 區塊的 HTML 字串
 * @param closeBracket - 是否在 title 後加上 ]（預設 true）
 */
export function createPopupHTML(
  headerColor: string,
  title: string,
  bodyContent: string,
  closeBracket = true,
): string {
  return `
    <div class="terminal-popup">
      <div class="terminal-popup-header" style="color:${headerColor}">
        [ ${title}${closeBracket ? ' ]' : ''}
      </div>
      <div class="terminal-popup-body">
        ${bodyContent}
      </div>
    </div>
  `
}

// ========== 資料品質警示 ==========

/**
 * 計算資料品質警示文字（路寬偏移 + 定位偏移）
 * @param roadWidth    - 都市計畫路寬（null 表示無計畫值）
 * @param width        - 消防局實測路寬
 * @param snapDistance - 貼齊距離（null 表示無資料）
 * @returns 警示提醒文字，無異常時回傳 '無'
 */
export function buildWarningHTML(
  roadWidth: number | null,
  width: number,
  snapDistance: number | null,
): string {
  const warnings: string[] = []

  if (roadWidth !== null) {
    const absWidthDiff = Math.abs(roadWidth - width)
    if (absWidthDiff > WARN_WIDTH_HIGH)     warnings.push(`路寬偏移 ${HIGH_WARN_BADGE}`)
    else if (absWidthDiff > WARN_WIDTH_MID) warnings.push(`路寬偏移 ${MID_WARN_BADGE}`)
  }

  if (snapDistance !== null) {
    if (snapDistance > WARN_DISTANCE_HIGH)     warnings.push(`距離偏移 ${HIGH_WARN_BADGE}`)
    else if (snapDistance > WARN_DISTANCE_MID) warnings.push(`距離偏移 ${MID_WARN_BADGE}`)
  }

  return warnings.length > 0 ? warnings.join(' ') : '無'
}
