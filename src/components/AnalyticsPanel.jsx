import React from 'react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList 
} from 'recharts';
import { Clock, Activity, TrendingUp } from 'lucide-react';

export default function AnalyticsPanel({ stats }) {
  if (!stats) return <div className="h-full p-6 flex items-center justify-center text-neutral-500">載入中...</div>;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1'];

  return (
    <div className="flex flex-col h-full p-6 text-white overflow-y-auto">
      <div className="mb-6 flex items-center gap-2">
        <Activity className="text-blue-400" />
        <h2 className="text-lg font-bold text-neutral-100">數據分析</h2>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-neutral-800/60 p-4 rounded-xl border border-neutral-700/50 shadow-inner">
          <p className="text-xs text-neutral-400 mb-1 flex items-center gap-1">
            <TrendingUp size={12} /> 總旅次數
          </p>
          <p className="text-xl font-bold text-blue-400">
            {stats.totalTrips.toLocaleString()}
          </p>
        </div>
        <div className="bg-neutral-800/60 p-4 rounded-xl border border-neutral-700/50 shadow-inner">
          <p className="text-xs text-neutral-400 mb-1 flex items-center gap-1">
            <Clock size={12} /> 平均時間
          </p>
          <p className="text-xl font-bold text-emerald-400">
            {stats.avgTravelTime} <span className="text-xs font-normal text-emerald-500">分鐘</span>
          </p>
        </div>
      </div>

      {/* Mode Share */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-neutral-300 mb-4">運具市占率 (Mode Share)</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.modeShare}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {stats.modeShare.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#171717', borderColor: '#333', borderRadius: '8px' }}
                itemStyle={{ color: '#e5e5e5' }}
                formatter={(value) => value.toLocaleString()}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-2">
          {stats.modeShare.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              {entry.name}
            </div>
          ))}
        </div>
      </div>

      {/* Congestion Ranking */}
      <div className="mt-auto">
        <h3 className="text-sm font-semibold text-neutral-300 mb-4">十大壅塞村里</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stats.rankings}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" />
              <XAxis type="number" domain={[0, 1]} hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 10 }} 
                width={70}
              />
              <RechartsTooltip 
                cursor={{ fill: '#262626' }}
                contentStyle={{ backgroundColor: '#171717', borderColor: '#333', borderRadius: '8px' }}
                formatter={(val) => [`${(val * 100).toFixed(1)}%`, '壅塞度']}
              />
              <Bar 
                dataKey="congestion" 
                fill="#ef4444" 
                radius={[0, 4, 4, 0]} 
                barSize={12}
                background={{ fill: '#262626' }}
              >
                <LabelList 
                  dataKey="congestion" 
                  position="right" 
                  formatter={(val) => `${(val * 100).toFixed(0)}%`}
                  fill="#9ca3af"
                  fontSize={10}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
