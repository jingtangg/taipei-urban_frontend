/**
 * Popup HTML 工具函式
 *
 * 職責:
 * - 產生 terminal 風格的 popup HTML 字串（供 OL Overlay innerHTML 使用）
 * - 依 feature 型別 dispatch 對應的 popup 內容（resolveFeaturePopup）
 * - 計算資料品質警示徽章（路寬偏移 / 定位偏移）
 *
 * 注意：innerHTML 而非 React render
 * OL Overlay 是 DOM 節點，React 無法對其進行 reconcile，
 * 因此透過 innerHTML 注入 HTML 字串是唯一合理做法。
 * 所有插值均來自後端 API 回傳的結構化資料，不含使用者自由輸入，
 * 無 XSS 風險。
 */

import { COLOR_DANGER, COLOR_WARNING, COLOR_PRIMARY } from '../constants/colors'
import {
  WARN_WIDTH_HIGH,
  WARN_WIDTH_MID,
  WARN_DISTANCE_HIGH,
  WARN_DISTANCE_MID,
} from '../constants/dataQualityThresholds'
import type { PopupFeatureProps } from '../types/geo'
import { getRiskInfo } from './riskUtils'

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

// ========== Feature → Popup HTML dispatch ==========

type ClickableFeatureProps = Exclude<PopupFeatureProps, { type: 'district_marker' }>

/**
 * 依 feature 型別產生對應的 popup HTML 字串
 * district_marker 不經過此函式（由呼叫端處理 drill-down 邏輯）
 */
export function resolveFeaturePopup(props: ClickableFeatureProps): string {
  switch (props.type) {
    case 'road': {
      const { level, desc } = getRiskInfo(props.width_m)
      return createPopupHTML(
        COLOR_PRIMARY,
        `計畫路寬: ${props.width_m.toFixed(1)}M`,
        `
          <p>> 風險等級: ${level}</p>
          <p>> 風險描述: ${desc}</p>
          <p>> 資料來源: 都市計畫道路</p>
        `
      )
    }
    case 'narrow_alley': {
      const { width_m, road_width, snap_distance_m, alley_name, category } = props
      const { level, desc } = getRiskInfo(width_m)
      const warningText   = buildWarningHTML(road_width, width_m, snap_distance_m)
      const widthDiffText = road_width ? (road_width - width_m).toFixed(1) + 'm' : '未有計畫值，待確認'
      return createPopupHTML(
        COLOR_PRIMARY,
        `實際路寬: ${width_m.toFixed(1)}M ] ${alley_name || '未知巷道'}`,
        `
          <p>> 風險等級: ${level}</p>
          <p>> 風險描述: ${desc}</p>
          <p>> 計畫路寬: ${road_width ? road_width.toFixed(1) + 'M' : '未知'}</p>
          <p>> 路寬差異: ${widthDiffText}</p>
          <p>> 消防局分類: ${category}</p>
          ${warningText !== '無' ? `<p>> 警示提醒: ${warningText}</p>` : ''}
          <p>> 資料來源: 消防局 113 年窄巷清冊</p>
        `,
        false
      )
    }
    case 'hydrant': {
      const typeText = props.hydrant_type === 'aboveground' ? '地上式消防栓' : '地下式消防栓'
      return createPopupHTML(
        COLOR_PRIMARY,
        typeText,
        `
          <p>> 所屬轄區: ${props.district}</p>
          <p>> 設備狀態: 正常運作</p>
        `
      )
    }
    case 'station': {
      return createPopupHTML(
        COLOR_PRIMARY,
        props.name,
        `
          <p>> 地址: ${props.address}</p>
          <p>> 聯繫狀態: 在線</p>
        `
      )
    }
  }
}
