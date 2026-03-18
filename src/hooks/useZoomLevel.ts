/**
 * Zoom Level 監聽 Hook
 *
 * 職責:
 * - 統一管理地圖 zoom level 的監聽與狀態
 * - 避免多個 hook 重複監聽同一個事件
 * - 提供當前 zoom level 給需要的組件使用
 */

import { useEffect, useState } from 'react'
import Map from 'ol/Map'

/**
 * 監聽地圖 zoom level 變化
 *
 * @param map - OpenLayers Map 實例
 * @returns 當前的 zoom level (預設 13)
 */
export function useZoomLevel(map: Map | null): number {
  const [currentZoom, setCurrentZoom] = useState<number>(13)

  useEffect(() => {
    if (!map) return

    const updateZoom = () => {
      const zoom = map.getView().getZoom()
      if (zoom !== undefined) {
        setCurrentZoom(zoom)
      }
    }

    // 初始化 zoom
    updateZoom()

    // 監聽 zoom 變化
    map.getView().on('change:resolution', updateZoom)

    return () => {
      map.getView().un('change:resolution', updateZoom)
    }
  }, [map])

  return currentZoom
}
