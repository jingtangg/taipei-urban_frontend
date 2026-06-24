import { useRef, useState, useEffect, useCallback } from 'react'
import Overlay from 'ol/Overlay'
import { LineString } from 'ol/geom'
import type MapBrowserEvent from 'ol/MapBrowserEvent'
import { unByKey } from 'ol/Observable'
import { toLonLat } from 'ol/proj'

import { useHualienMapInit } from '../hooks/useHualienMapInit'
import { useHualienAlleyLayer } from '../hooks/useHualienAlleyLayer'
import { createPopupHTML } from '../utils/popupUtils'
import { COLOR_PRIMARY, COLOR_DANGER, COLOR_WARNING } from '../constants/colors'

const RISK_COLOR: Record<string, string> = {
  '極高風險': COLOR_DANGER,
  '高風險':   COLOR_WARNING,
  '一般':     COLOR_PRIMARY,
}

const RISK_DESC: Record<string, string> = {
  '極高風險': '消防車無法通行',
  '高風險':   '通行受限',
  '一般':     '正常通行',
}

function buildHualienPopup(props: Record<string, unknown>): string {
  const riskColor = RISK_COLOR[props.risk_level as string] ?? COLOR_PRIMARY
  const riskDesc  = RISK_DESC[props.risk_level as string] ?? '未知'
  const widthText = props.width_m_min === props.width_m_max
    ? `${(props.width_m_min as number).toFixed(1)}M`
    : `${(props.width_m_min as number).toFixed(1)}–${(props.width_m_max as number).toFixed(1)}M`

  return createPopupHTML(
    riskColor,
    `${props.alley_name as string}`,
    `
      <p>> 鄉鎮市區: ${props.township as string}</p>
      <p>> 路寬: ${widthText}</p>
      <p>> 風險等級: ${props.risk_level as string}</p>
      <p>> 風險描述: ${riskDesc}</p>
      ${props.fire_station ? `<p>> 管轄消防局: ${props.fire_station as string}</p>` : ''}
      <p>> 資料來源: 花蓮縣消防局窄巷清冊</p>
    `,
  )
}

export default function HualienPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const popupRef     = useRef<HTMLDivElement>(null)
  const overlayRef   = useRef<Overlay | null>(null)

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const onMouseMove = useCallback((c: { x: number; y: number }) => {
    const [lng, lat] = toLonLat([c.x, c.y])
    setCoords({ lat, lng })
  }, [])

  const mapRef = useHualienMapInit(containerRef, onMouseMove)
  const { loading, error } = useHualienAlleyLayer(mapRef.current, '')

  // Popup overlay 初始化
  useEffect(() => {
    if (!mapRef.current || overlayRef.current) return
    const overlay = new Overlay({
      element: popupRef.current!,
      autoPan: { animation: { duration: 250 } },
    })
    mapRef.current.addOverlay(overlay)
    overlayRef.current = overlay
    return () => {
      mapRef.current?.removeOverlay(overlay)
      overlayRef.current = null
    }
  }, [mapRef.current])

  // 點擊事件
  useEffect(() => {
    if (!mapRef.current) return
    const key = mapRef.current.on('click', (evt: MapBrowserEvent) => {
      const map = mapRef.current!
      const features: unknown[] = []
      map.forEachFeatureAtPixel(evt.pixel, f => features.push(f), { hitTolerance: 10 })

      const feature = features[0] as any
      if (!feature) {
        overlayRef.current?.setPosition(undefined)
        return
      }

      const props = feature.getProperties() as Record<string, unknown>
      if (props.type !== 'hualien_alley') {
        overlayRef.current?.setPosition(undefined)
        return
      }

      const popupContent = buildHualienPopup(props)
      if (popupRef.current && overlayRef.current) {
        popupRef.current.innerHTML = popupContent
        const geom = feature.getGeometry()
        let coord = evt.coordinate
        if (geom?.getType() === 'LineString') {
          const cs = (geom as LineString).getCoordinates()
          coord = cs[Math.floor(cs.length / 2)]
        }
        overlayRef.current.setPosition(coord)
      }
    })
    return () => { unByKey(key) }
  }, [mapRef.current])

  return (
    <div className="w-screen h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">

      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-2 border-b border-[#00ff41]/20 bg-[#0a0a0a] z-10 shrink-0">
        <h1 className="font-mono text-[#00ff41] text-sm tracking-widest">
          花蓮縣｜窄巷防災地圖
        </h1>

        {/* 載入狀態 */}
        {loading && (
          <span className="font-mono text-[10px] text-[#00ff41]/60 animate-pulse">載入中…</span>
        )}
        {error && (
          <span className="font-mono text-[10px] text-[#ff4444]">資料載入失敗</span>
        )}

        {/* 圖例 */}
        <div className="ml-auto flex items-center gap-3 font-mono text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-0.5 bg-[#fc2121]"/>
            極高風險
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-0.5 bg-[#ffaa00]"/>
            高風險
          </span>
          <a
            href="/"
            className="text-[#00ff41]/50 hover:text-[#00ff41] transition-colors ml-4"
          >
            ← 台北地圖
          </a>
        </div>
      </header>

      {/* 地圖 */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="w-full h-full" />
        <div ref={popupRef} className="ol-popup" />

        {/* 縮放按鈕 */}
        <div className="absolute bottom-8 right-4 z-[1000] flex flex-col gap-2">
          {['+', '-'].map((sign, i) => (
            <button
              key={sign}
              onClick={() => {
                const view = mapRef.current?.getView()
                if (view) {
                  const z = view.getZoom()
                  if (z !== undefined) view.animate({ zoom: z + (i === 0 ? 1 : -1), duration: 250 })
                }
              }}
              className="terminal-btn w-10 h-10 flex items-center justify-center text-xl bg-black/80"
            >
              {sign}
            </button>
          ))}
        </div>
      </div>

      {/* 座標列 */}
      {coords && (
        <div className="shrink-0 px-3 py-1 border-t border-[#00ff41]/10 font-mono text-[10px] text-[#00ff41]/50 bg-[#0a0a0a]">
          {coords.lat.toFixed(6)}N &nbsp; {coords.lng.toFixed(6)}E
        </div>
      )}
    </div>
  )
}
