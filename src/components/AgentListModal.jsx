import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;

export default function AgentListModal({ agents, nodes, onClose }) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil((agents?.length || 0) / PAGE_SIZE);

  const currentAgents = useMemo(() => {
    if (!agents) return [];
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return agents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [agents, currentPage]);

  const getNodeName = (nodeId) => {
    const node = nodes?.find(n => n.id === nodeId);
    return node ? node.name : nodeId;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-full flex flex-col bg-neutral-900 border border-neutral-700/50 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div>
            <h2 className="text-xl font-bold text-white">代理人列表 (Agent List)</h2>
            <p className="text-sm text-neutral-400 mt-1">
              總人數: {agents?.length.toLocaleString() || 0}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="text-xs text-neutral-400 uppercase bg-neutral-800/50 sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-6 py-3 rounded-tl-lg">ID</th>
                <th className="px-6 py-3">居住地 (Home)</th>
                <th className="px-6 py-3">今日目的地 (Daytime Dest.)</th>
                <th className="px-6 py-3">身分</th>
                <th className="px-6 py-3">交通工具</th>
                <th className="px-6 py-3 rounded-tr-lg">目前位置</th>
              </tr>
            </thead>
            <tbody>
              {currentAgents.map((agent) => (
                <tr key={agent.id} className="border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-neutral-400">{agent.id}</td>
                  <td className="px-6 py-4 font-medium">{getNodeName(agent.homeNode)}</td>
                  <td className="px-6 py-4 text-neutral-400">{getNodeName(agent.daytimeDest)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      agent.type === 'Worker' ? 'bg-blue-500/20 text-blue-300' :
                      agent.type === 'Student' ? 'bg-emerald-500/20 text-emerald-300' :
                      'bg-purple-500/20 text-purple-300'
                    }`}>
                      {agent.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-400">{agent.vehicle}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      已返家
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {currentAgents.length === 0 && (
            <div className="text-center py-10 text-neutral-500">
              目前沒有代理人資料
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/80 flex items-center justify-between">
          <div className="text-sm text-neutral-400">
            顯示第 <span className="font-medium text-white">{((currentPage - 1) * PAGE_SIZE) + 1}</span> 到 <span className="font-medium text-white">{Math.min(currentPage * PAGE_SIZE, agents?.length || 0)}</span> 筆
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-neutral-400 px-2">
              {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
