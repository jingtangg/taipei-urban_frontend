/**
 * 地圖核心設定常數
 */

import { fromLonLat } from 'ol/proj'

// ========== GeoServer ==========

function resolveGeoServerUrl(): string {
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8090/geoserver/taipei_urban/wms'
  }
  return 'https://api.vividstudio.net/geoserver/taipei_urban/wms'
}

export const GEOSERVER_WMS_URL = resolveGeoServerUrl()

// ========== 總覽視角 ==========

/** 台北市總覽中心點（WGS84 → Web Mercator） */
export const DISTRICT_OVERVIEW_CENTER = fromLonLat([121.5654, 25.065])
/** 總覽縮放層級 */
export const DISTRICT_OVERVIEW_ZOOM = 12.2

// ========== Zoom 門檻 ==========

/**
 * 詳細圖層顯示門檻
 * Zoom < 15：只顯示行政區邊界（總覽層）
 * Zoom ≥ 15：顯示窄巷 + 消防栓 + 消防局（詳細層）
 */
export const DETAIL_ZOOM_THRESHOLD = 15
