/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import MapView, { MapViewHandle } from './components/Map';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Cpu, Database, Activity, ChevronLeft, ChevronRight, Map as MapIcon, Layers, Maximize } from 'lucide-react';

const Typewriter = ({ text, delay = 50 }: { text: string, delay?: number }) => {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prevText => prevText + text[currentIndex]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, delay, text]);

  return <span>{currentText}</span>;
};

export default function App() {
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [baseLayer, setBaseLayer] = useState<'light' | 'satellite'>('light');
  const [layers, setLayers] = useState({
    roads: true,
    hydrants: true,
    stations: true,
    districts: true
  });
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [coords, setCoords] = useState({ x: 306561.42, y: 2769890.18 });
  const mapRef = useRef<MapViewHandle>(null);

  const districts = ['all', '信義區', '大安區', '中山區', '內湖區', '士林區', '北投區', '松山區', '萬華區', '中正區', '大同區', '南港區', '文山區'];

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0a] overflow-hidden font-mono selection:bg-[#00ff41] selection:text-black crt-overlay">
      {/* Left Sidebar: Terminal Filters */}
      <AnimatePresence mode="wait">
        {isLeftOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
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
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full bg-black border border-[#00ff41] text-[#00ff41] text-xs px-3 py-2 outline-none appearance-none cursor-pointer hover:bg-[#00ff41]/10 transition-colors font-mono"
                  >
                    {districts.map((d) => (
                      <option key={d} value={d} className="bg-black text-[#00ff41]">
                        {d === 'all' ? '> 台北市全區' : `> ${d}`}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#00ff41] text-[10px]">▼</div>
                </div>
              </section>

              {/* Statistics Panel */}
              <div className="space-y-6">
                <section className="space-y-4">
                  <div>
                    <h3 className="text-[#00ff41] font-bold text-xs mb-2 border-l-2 border-[#00ff41] pl-2 uppercase tracking-wider">窄巷數據</h3>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div className="p-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                        <p className="opacity-60 mb-1">數量</p>
                        <p className="text-[#00ff41] text-sm font-bold">1744 <span className="text-[10px] font-normal">條</span></p>
                      </div>
                      <div className="p-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                        <p className="opacity-60 mb-1">總長度</p>
                        <p className="text-[#00ff41] text-sm font-bold">100.1 <span className="text-[10px] font-normal">km</span></p>
                      </div>
                      <div className="col-span-2 p-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                        <p className="opacity-60 mb-1">分佈密度</p>
                        <p className="text-[#00ff41] text-sm font-bold">0.37 <span className="text-[10px] font-normal">km/km²</span></p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[#00ff41] font-bold text-xs mb-2 border-l-2 border-[#00ff41] pl-2 uppercase tracking-wider">消防栓數據</h3>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div className="p-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                        <p className="opacity-60 mb-1">數量</p>
                        <p className="text-[#00ff41] text-sm font-bold">3074 <span className="text-[10px] font-normal">個</span></p>
                      </div>
                      <div className="p-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                        <p className="opacity-60 mb-1">設置密度</p>
                        <p className="text-[#00ff41] text-sm font-bold">11.3 <span className="text-[10px] font-normal">/km²</span></p>
                      </div>
                      <div className="col-span-2 p-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                        <div className="flex justify-between items-end mb-1">
                          <p className="opacity-60">服務半徑</p>
                          <p className="text-[8px] opacity-40 italic">r = √(A / n / π)</p>
                        </div>
                        <p className="text-[#00ff41] text-sm font-bold">168 <span className="text-[10px] font-normal">m</span></p>
                      </div>
                    </div>
                  </div>
                </section>

                {selectedDistrict === 'all' && (
                  <section>
                    <h3 className="text-[#00ff41] font-bold text-xs mb-3 border-l-2 border-[#00ff41] pl-2 uppercase tracking-wider">行政區密度排名</h3>
                    <div className="space-y-1 text-[10px] font-mono">
                      {[
                        { rank: 1, name: '大同區', val: '1.97' },
                        { rank: 2, name: '萬華區', val: '1.39' },
                        { rank: 3, name: '中正區', val: '1.14' },
                        { rank: 4, name: '松山區', val: '0.84' },
                        { rank: 5, name: '大安區', val: '0.81' },
                        { rank: 6, name: '中山區', val: '0.77' },
                        { rank: 7, name: '信義區', val: '0.50' },
                        { rank: 8, name: '文山區', val: '0.23' },
                        { rank: 9, name: '南港區', val: '0.20' },
                        { rank: 10, name: '士林區', val: '0.16' },
                        { rank: 11, name: '內湖區', val: '0.16' },
                        { rank: 12, name: '北投區', val: '0.15' },
                      ].map((item) => (
                        <div key={item.name} className="flex items-center justify-between p-1 hover:bg-[#00ff41]/10 border-b border-[#00ff41]/10 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="w-4 opacity-40">{item.rank}</span>
                            <span className="text-[#00ff41]">{item.name}</span>
                          </div>
                          <span className="font-bold">{item.val}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Map Area */}
      <main className="relative flex-1 h-full bg-black overflow-hidden">
        {/* Toggle Left Sidebar */}
        <button 
          onClick={() => setIsLeftOpen(!isLeftOpen)}
          className="absolute top-4 left-4 z-40 terminal-btn p-1 bg-black/80"
        >
          {isLeftOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        {/* Map Component */}
        <div className="w-full h-full opacity-80 grayscale contrast-125">
          <MapView 
            ref={mapRef} 
            selectedDistrict={selectedDistrict} 
            baseLayer={baseLayer} 
            layers={layers}
            onMouseMove={(c) => setCoords(c)}
          />
        </div>

        {/* Toggle Right Sidebar */}
        <button 
          onClick={() => setIsRightOpen(!isRightOpen)}
          className="absolute top-4 right-4 z-40 terminal-btn p-1 bg-black/80"
        >
          {isRightOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        {/* Bottom Info Bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 terminal-card py-1 px-4 flex items-center gap-6 bg-black/90">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#00ff41] rounded-full animate-ping" />
          </div>
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

      {/* Right Sidebar: Terminal Controls */}
      <AnimatePresence mode="wait">
        {isRightOpen && (
          <motion.aside
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
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
                  <MapIcon className="w-4 h-4" />
                  執行視角重置
                </button>
              </section>

              <section>
                <h3 className="font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2 text-[#00ff41]">
                  <Layers className="w-4 h-4" /> 圖層疊加
                </h3>
                <div className="space-y-1">
                  <button 
                    onClick={() => toggleLayer('roads')}
                    className={`w-full terminal-btn text-left text-xs flex justify-between items-center ${layers.roads ? 'bg-[#00ff41]/20' : ''}`}
                  >
                    <span>道路寬度</span>
                    {layers.roads && <span className="text-[#00ff41]">✓</span>}
                  </button>
                  <button 
                    onClick={() => toggleLayer('hydrants')}
                    className={`w-full terminal-btn text-left text-xs flex justify-between items-center ${layers.hydrants ? 'bg-[#00ff41]/20' : ''}`}
                  >
                    <span>消防栓分佈</span>
                    {layers.hydrants && <span className="text-[#00ff41]">✓</span>}
                  </button>
                  <button 
                    onClick={() => toggleLayer('stations')}
                    className={`w-full terminal-btn text-left text-xs flex justify-between items-center ${layers.stations ? 'bg-[#00ff41]/20' : ''}`}
                  >
                    <span>消防分隊</span>
                    {layers.stations && <span className="text-[#00ff41]">✓</span>}
                  </button>
                  <button 
                    onClick={() => toggleLayer('districts')}
                    className={`w-full terminal-btn text-left text-xs flex justify-between items-center ${layers.districts ? 'bg-[#00ff41]/20' : ''}`}
                  >
                    <span>行政區界</span>
                    {layers.districts && <span className="text-[#00ff41]">✓</span>}
                  </button>
                </div>
              </section>

              <section className="p-4 border border-[#00ff41]/30">
                <h3 className="font-bold uppercase tracking-widest text-[10px] mb-3 text-[#00ff41]">圖例說明</h3>
                <div className="space-y-2 text-[10px]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-1 bg-[#ff4444]" />
                    <span className="opacity-80 text-[#00ff41]">窄路 (&lt; 3.5m)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-1 bg-[#ffaa00]" />
                    <span className="opacity-80 text-[#00ff41]">中等路寬 (3.5–6m)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-1 bg-[#00ff41]" />
                    <span className="opacity-80 text-[#00ff41]">寬路 (&gt; 6m)</span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2 text-[#00ff41]">
                  <Activity className="w-4 h-4" /> 視覺模式
                </h3>
                <div className="space-y-1">
                  <button 
                    onClick={() => setBaseLayer('light')}
                    className={`w-full terminal-btn text-left text-xs ${baseLayer === 'light' ? 'bg-[#00ff41] text-black' : ''}`}
                  >
                    {`[ ] 向量網格`}
                  </button>
                  <button 
                    onClick={() => setBaseLayer('satellite')}
                    className={`w-full terminal-btn text-left text-xs ${baseLayer === 'satellite' ? 'bg-[#00ff41] text-black' : ''}`}
                  >
                    {`[ ] 衛星掃描`}
                  </button>
                </div>
              </section>

              <div className="h-px bg-[#00ff41]/30 my-6" />

              <section className="pt-0">
                <div className="p-3 border border-[#00ff41]/30 text-[#00ff41]/60 text-[9px] uppercase leading-relaxed font-mono">
                  <p className="mb-2 text-[#00ff41] font-bold">!! 警告 !!</p>
                  未經授權禁止訪問都市計畫數據。第七區協定生效中。所有查詢均已被系統記錄。
                </div>
              </section>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
