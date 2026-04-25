import React from 'react';
import { Play, RotateCcw, Settings, Users, Calendar } from 'lucide-react';
import clsx from 'clsx';

export default function ControlPanel({
  day,
  scenario,
  agents,
  isPlaying,
  onRunSimulation,
  onReset,
  onScenarioChange,
  onAgentsChange
}) {
  return (
    <div className="flex flex-col h-full p-6 text-white overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          城市交通模擬器
        </h1>
        <p className="text-sm text-neutral-400 mt-2">微觀代理人模型視覺化</p>
      </div>

      <div className="space-y-8 flex-1">
        {/* Day Status */}
        <div className="bg-neutral-800/60 p-4 rounded-xl border border-neutral-700/50 shadow-inner">
          <div className="flex items-center gap-3 text-neutral-300 mb-2">
            <Calendar size={18} className="text-blue-400" />
            <span className="font-medium text-sm">模擬天數</span>
          </div>
          <div className="text-3xl font-mono font-bold text-white">
            第 {day} 天
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          {/* Scenario */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-3">
              <Settings size={16} /> 情境設定
            </label>
            <div className="flex flex-col gap-2">
              {[
                { id: 'baseline', label: '標準情境 (Baseline)' },
                { id: 'high_temp', label: '高溫炎熱 (提升汽車比例)' },
                { id: 'congestion', label: '壅塞敏感 (路網效能下降)' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => onScenarioChange(opt.id)}
                  className={clsx(
                    "px-4 py-2 text-left text-sm rounded-lg border transition-all duration-200",
                    scenario === opt.id
                      ? "bg-blue-500/20 border-blue-500 text-blue-300"
                      : "bg-neutral-800/60 border-neutral-700 text-neutral-400 hover:bg-neutral-700"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Agents */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-3">
              <Users size={16} /> 活躍市民數量
            </label>
            <input
              type="range"
              min="1000"
              max="20000"
              step="1000"
              value={agents}
              onChange={(e) => onAgentsChange(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-neutral-500 mt-2 font-mono">
              <span>1k</span>
              <span className="text-blue-400 font-bold">{agents.toLocaleString()}</span>
              <span>20k</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 mt-auto pt-6">
        <button
          onClick={onRunSimulation}
          disabled={isPlaying}
          className={clsx(
            "flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all duration-300",
            isPlaying
              ? "bg-emerald-500/50 text-emerald-200 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          )}
        >
          <Play size={18} fill="currentColor" />
          {isPlaying ? '運算中...' : '執行下一天'}
        </button>
        
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 py-3 rounded-xl font-medium bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 transition-all border border-neutral-700"
        >
          <RotateCcw size={18} />
          重置模擬
        </button>
      </div>
    </div>
  );
}
