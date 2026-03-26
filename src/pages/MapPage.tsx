import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {Terminal, Cpu, Database, Activity, ChevronLeft, ChevronRight, Map as MapIcon, Layers, Maximize} from 'lucide-react'
import MapView, { type MapViewHandle } from '../components/Map'
import { getDistricts, getNarrowAlleyStatistics, getDistrictRankings, getHydrantStatistics } from '../services/urbanApi'
import type { District, NarrowAlleyStatistics, DistrictRanking, HydrantStatistics } from '../types/geo'

const Typewriter = ({ text, delay = 50 }: { text: string; delay?: number }) => {
  const [current, setCurrent] = useState('')
  const [idx, setIdx] = useState(0)

  React.useEffect(() => { setCurrent(''); setIdx(0); }, [text])
  React.useEffect(() => {
    if (idx < text.length) {
      const t = setTimeout(() => {setCurrent(p => p + text[idx]); setIdx(p => p + 1)}, delay)
      return () => clearTimeout(t)
    }
  }, [idx, delay, text])

  return <span>{current}</span>
}

export default function MapPage() {
  const [selectedDistrict, setSelectedDistrict] = useState('all')
  const [baseLayer, setBaseLayer] = useState<'light' | 'satellite'>('light')
  const [layers, setLayers] = useState({roads: true, narrowAlleys: true, hydrants: true, stations: true, districts: true})
  const [isLeftOpen,  setIsLeftOpen]  = useState(true)
  const [isRightOpen, setIsRightOpen] = useState(true)
  const [coords, setCoords] = useState({ x: 306561.42, y: 2874758.18 }) //TWD97 座標的 游標位置
  const mapRef = useRef<MapViewHandle>(null)
  const [districts, setDistricts] = useState<District[]>([])
  const [stats, setStats] = useState<NarrowAlleyStatistics | null>(null)
  const [rankings, setRankings] = useState<DistrictRanking[]>([])
  const [hydrantStats, setHydrantStats] = useState<HydrantStatistics | null>(null)

  // 載入行政區資料
  useEffect(() => {
    getDistricts().then(setDistricts).catch(console.error)
  }, [])

  // 載入窄巷統計（根據選擇的行政區）
  useEffect(() => {
    const district = selectedDistrict === 'all' ? undefined : selectedDistrict
    getNarrowAlleyStatistics(district)
      .then(setStats)
      .catch(console.error)
  }, [selectedDistrict])

  // 載入消防栓統計（根據選擇的行政區）
  useEffect(() => {
    const district = selectedDistrict === 'all' ? undefined : selectedDistrict
    getHydrantStatistics(district)
      .then(setHydrantStats)
      .catch(console.error)
  }, [selectedDistrict])

  // 載入行政區排名（僅全區時顯示）
  useEffect(() => {
    if (selectedDistrict === 'all') {
      getDistrictRankings()
        .then(setRankings)
        .catch(console.error)
    }
  }, [selectedDistrict])

  const toggleLayer = (layer: keyof typeof layers) =>
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }))

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0a] overflow-hidden font-mono selection:bg-[#00ff41] selection:text-black crt-overlay">

      {/* Left Sidebar */}
      <AnimatePresence>
        {isLeftOpen && (
          <motion.aside
            initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
            className="w-[300px] h-full bg-black border-r border-[#00ff41] z-30 flex flex-col shadow-[0_0_15px_rgba(0,255,65,0.2)]"
          >
            <div className="p-6 border-b border-[#00ff41] bg-[#00ff41]/5">
              <div className="flex items-center gap-2 text-[#00ff41] mb-2">
                <Terminal className="w-5 h-5" />
                <span className="text-xs font-bold tracking-widest uppercase">系統終端機</span>
              </div>
              <h1 className="text-2xl font-black text-[#00ff41] tracking-tighter">
                <Typewriter text="TAIPEI_URBAN_OS" />
              </h1>
              <p className="mt-2 text-[10px] opacity-70 uppercase tracking-widest">核心版本 v1.0.0-穩定版</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-terminal">
              <section>
                <div className="flex items-center gap-2 mb-4 text-[#00ff41]">
                  <Database className="w-4 h-4" />
                  <h2 className="font-bold uppercase tracking-widest text-sm">區域選擇</h2>
                </div>
                <div className="relative">
                  <select
                    value={selectedDistrict}
                    onChange={e => setSelectedDistrict(e.target.value)}
                    className="w-full bg-black border border-[#00ff41] text-[#00ff41] text-xs px-3 py-2 outline-none appearance-none cursor-pointer hover:bg-[#00ff41]/10 transition-colors font-mono"
                  >
                    <option value="all" className="bg-black text-[#00ff41]">
                      {'> 台北市全區'}
                    </option>
                    {districts.map(d => (
                      <option key={d.id} value={d.name} className="bg-black text-[#00ff41]">
                        {`> ${d.name}`}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#00ff41] text-[10px]">▼</div>
                </div>
              </section>

              {/* 統計面板 */}
              <div className="space-y-6">
                <section className="space-y-4">
                  <div>
                    <h3 className="text-[#00ff41] font-bold text-xs mb-2 border-l-2 border-[#00ff41] pl-2 uppercase tracking-wider">窄巷數據</h3>
                    {stats ? (
                      <div className="space-y-2 text-[10px] font-mono">
                        {/* Row 1: 總窄巷數 - full width */}
                        <div className="p-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                          <p className="opacity-60 mb-1">總窄巷數</p>
                          <p className="text-[#00ff41] text-sm font-bold">{stats.total} <span className="text-[10px] font-normal">條</span></p>
                        </div>
                        {/* Row 2: 都市計畫 (left) + 消防局重疊 (right) */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                            <p className="opacity-60 mb-1">都市計畫窄巷</p>
                            <p className="text-[#00ff41] text-sm font-bold">{stats.planned} <span className="text-[10px] font-normal">條</span></p>
                          </div>
                          <div className="p-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                            <p className="opacity-60 mb-1">消防局重疊</p>
                            <p className="text-[#00ff41] text-sm font-bold">{stats.overlap} <span className="text-[10px] font-normal">條</span></p>
                          </div>
                        </div>
                        {/* Row 3: 消防局實際新增 - full width */}
                        <div className="p-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                          <p className="opacity-60 mb-1">消防局實際新增</p>
                          <p className="text-[#00ff41] text-sm font-bold">{stats.new_discovered} <span className="text-[10px] font-normal">條</span></p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 border border-[#00ff41]/20 bg-[#00ff41]/5 text-[10px] opacity-60">
                        載入中...
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-[#00ff41] font-bold text-xs mb-2 border-l-2 border-[#00ff41] pl-2 uppercase tracking-wider">消防栓數據</h3>
                    {hydrantStats ? (
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="p-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                          <p className="opacity-60 mb-1">總消防栓數</p>
                          <p className="text-[#00ff41] text-sm font-bold">{hydrantStats.total_count} <span className="text-[10px] font-normal">個</span></p>
                        </div>
                        <div className="p-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                          <p className="opacity-60 mb-1">設置密度</p>
                          <p className="text-[#00ff41] text-sm font-bold">{hydrantStats.density} <span className="text-[10px] font-normal">/km²</span></p>
                        </div>
                        <div className="col-span-2 p-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                          <div className="flex justify-between items-end mb-1">
                            <p className="opacity-60">服務半徑</p>
                            <p className="text-[8px] opacity-40 italic">r = √(A / n / π)</p>
                          </div>
                          <p className="text-[#00ff41] text-sm font-bold">{hydrantStats.service_radius} <span className="text-[10px] font-normal">m</span></p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 border border-[#00ff41]/20 bg-[#00ff41]/5 text-[10px] opacity-60">
                        載入中...
                      </div>
                    )}
                  </div>

                  {/* 行政區密度排名 - 僅全區時顯示 */}
                  {selectedDistrict === 'all' && (
                    <div>
                      <h3 className="text-[#00ff41] font-bold text-xs mb-2 border-l-2 border-[#00ff41] pl-2 uppercase tracking-wider">行政區密度排名</h3>
                      {rankings.length > 0 ? (
                        <div className="border border-[#00ff41]/20 bg-[#00ff41]/5 text-[10px] font-mono">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-[#00ff41]/20">
                                <th className="p-2 text-left opacity-60 font-normal">排名</th>
                                <th className="p-2 text-left opacity-60 font-normal">區域</th>
                                <th className="p-2 text-right opacity-60 font-normal">總計(條)</th>
                                <th className="p-2 text-right opacity-60 font-normal">密度(/km²)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rankings.map((item) => (
                                <tr key={item.district} className="border-b border-[#00ff41]/10 last:border-0">
                                  <td className="p-2 text-[#00ff41]">{item.rank}</td>
                                  <td className="p-2 text-[#00ff41]">{item.district}</td>
                                  <td className="p-2 text-right text-[#00ff41]">{item.total_count}</td>
                                  <td className="p-2 text-right text-[#00ff41]">{item.density.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-2 border border-[#00ff41]/20 bg-[#00ff41]/5 text-[10px] opacity-60">
                          載入中...
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Map Area */}
      <main className="relative flex-1 h-full bg-black overflow-hidden">
        <button
          onClick={() => setIsLeftOpen(!isLeftOpen)}
          className="absolute top-4 left-4 z-40 terminal-btn p-1 bg-black/80"
        >
          {isLeftOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        <div className="w-full h-full">
          <MapView
            ref={mapRef}
            baseLayer={baseLayer}
            selectedDistrict={selectedDistrict}
            layers={layers}
            onMouseMove={c => setCoords(c)}
            onDistrictClick={districtName => setSelectedDistrict(districtName)}
          />
        </div>

        <button
          onClick={() => setIsRightOpen(!isRightOpen)}
          className="absolute top-4 right-4 z-40 terminal-btn p-1 bg-black/80"
        >
          {isRightOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        {/* 座標列 */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 terminal-card py-1 px-4 flex items-center gap-6 bg-black/90">
          <div className="w-2 h-2 bg-[#00ff41] rounded-full animate-ping" />
          <div className="h-3 w-px bg-[#00ff41]/30" />
          <span className="text-[9px] uppercase tracking-widest opacity-80 flex gap-4 font-mono">
            <span className="text-[#00ff41]/60">座標系統: TWD97_TM2</span>
            <span className="font-bold text-[#00ff41]">
              X: {coords.x.toFixed(2)}
              <span className="mx-2 opacity-30">|</span>
              Y: {coords.y.toFixed(2)}
            </span>
          </span>
        </div>
      </main>

      {/* Right Sidebar */}
      <AnimatePresence>
        {isRightOpen && (
          <motion.aside
            initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }}
            className="w-[300px] h-full bg-black border-l border-[#00ff41] z-30 flex flex-col shadow-[0_0_15px_rgba(0,255,65,0.2)]"
          >
            <div className="p-6 border-b border-[#00ff41] bg-[#00ff41]/5">
              <div className="flex items-center gap-2 text-[#00ff41]">
                <Cpu className="w-5 h-5" />
                <h2 className="text-xl font-bold uppercase tracking-widest">指令中心</h2>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-terminal">
              <section>
                <h3 className="font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                  <Maximize className="w-4 h-4" /> 導航矩陣
                </h3>
                <button
                  onClick={() => mapRef.current?.zoomToTaipei()}
                  className="w-full terminal-btn flex items-center justify-center gap-2 py-3 text-sm"
                >
                  <MapIcon className="w-4 h-4" /> 執行視角重置
                </button>
              </section>

              <section>
                <h3 className="font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2 text-[#00ff41]">
                  <Layers className="w-4 h-4" /> 圖層疊加
                </h3>
                <div className="space-y-1">
                  {([
                    ['roads',        '都市計畫窄巷'],
                    ['narrowAlleys', '消防局實測窄巷'],
                    ['hydrants',     '消防栓分佈'],
                    ['stations',     '消防分隊'],
                    ['districts',    '行政區界'],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => toggleLayer(key)}
                      className={`w-full terminal-btn text-left text-xs flex justify-between items-center ${layers[key] ? 'bg-[#00ff41]/20' : ''}`}
                    >
                      <span>{label}</span>
                      {layers[key] && <span className="text-[#00ff41]">✓</span>}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2 text-[#00ff41]">
                  <Activity className="w-4 h-4" /> 視覺模式
                </h3>
                <div className="space-y-1">
                  {(['light', 'satellite'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setBaseLayer(mode)}
                      className={`w-full terminal-btn text-left text-xs ${baseLayer === mode ? 'bg-[#00ff41] text-black' : ''}`}
                    >
                      {mode === 'light' ? '[ ] 向量網格' : '[ ] 衛星掃描'}
                    </button>
                  ))}
                </div>
              </section>

              <section className="p-4 border border-[#00ff41]/30">
                <h3 className="font-bold uppercase tracking-widest text-[10px] mb-3 text-[#00ff41]">圖例說明</h3>
                <div className="space-y-3 text-[10px]">
                  {/* 行政區風險等級 */}
                  <div>
                    <p className="mb-2 opacity-60">行政區顏色分級</p>
                    {/* 分級說明 */}
                    <div className="space-y-1">
                      {[
                        { color: '#ff0000', label: '≥20 條/km²  極高風險' },
                        { color: '#ff6600', label: '7-20 條/km²  高風險' },
                        { color: '#ffaa00', label: '2-7 條/km²   中風險' },
                        { color: '#00ff41', label: '<2 條/km²    低風險' },
                      ].map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="opacity-80 text-[#00ff41] font-mono">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 opacity-60">消防局實測窄巷</p>
                    {[
                      { color: '#fc2121', label: '極高風險 (< 3.5m)' },
                      { color: '#ffaa00', label: '高風險 (3.5–6m)' },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-1" style={{ backgroundColor: color }} />
                        <span className="opacity-80 text-[#00ff41]">{label}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="mb-2 opacity-60">都市計畫窄巷</p>
                    {[
                      { color: '#feaeda', label: '極高風險 (< 3.5m)', dashed: true },
                      { color: '#fff873', label: '高風險 (3.5–6m)', dashed: true },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-1 border-t-2 border-dashed" style={{ borderColor: color }} />
                        <span className="opacity-80 text-[#00ff41]">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
