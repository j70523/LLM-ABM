import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';

const PAGE_SIZE = 50;

export default function AgentListModal({ agents, nodes, onClose }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const totalPages = Math.ceil((agents?.length || 0) / PAGE_SIZE);

  const currentAgents = useMemo(() => {
    if (!agents) return [];
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return agents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [agents, currentPage]);

  const getSortedSchedule = (agent) => {
    if (!agent || !agent.schedule) return [];
    return [...agent.schedule].sort((a, b) => a.departureHour - b.departureHour);
  };

  const getNodeName = (nodeId) => {
    const node = nodes?.find(n => n.id === nodeId);
    return node ? node.name : nodeId;
  };

  const downloadCSV = () => {
    if (!agents || agents.length === 0) return;

    const headers = [
      'ID', 'Age', 'Gender', 'Occupation', 'Salary', 'Household_Income', 
      'Home_Village', 'Vehicle_Ownership', 'Current_Location', 'Current_Activity',
      'Trait_Thriftiness', 'Trait_SocialMobility', 'Trait_CarPreference', 'Description'
    ];

    const csvContent = [
      headers.join(','),
      ...agents.map(agent => {
        return [
          agent.id,
          agent.age,
          agent.gender,
          agent.occupation,
          agent.salary,
          agent.household_income,
          getNodeName(agent.home_village) || agent.home_village,
          agent.vehicle_ownership,
          getNodeName(agent.currentLocation) || agent.currentLocation,
          agent.currentActivity || '無',
          agent.traits?.thriftiness?.toFixed(2) || 0,
          agent.traits?.socialMobility?.toFixed(2) || 0,
          agent.traits?.carPreference?.toFixed(2) || 0,
          `"${(agent.description || '').replace(/"/g, '""')}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'agents_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
            <h2 className="text-xl font-bold text-white">代理人列表 (群體)</h2>
            <p className="text-sm text-neutral-400 mt-1">
              總代理人群體數: {agents?.length.toLocaleString() || 0} (代表約 {(agents?.length * 100).toLocaleString() || 0} 人)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={downloadCSV}
              title="下載為 CSV"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Download size={18} />
              <span>下載 CSV</span>
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {!selectedAgent ? (
          <>
            {/* Table Content */}
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left text-sm text-neutral-300">
                <thead className="text-xs text-neutral-400 uppercase bg-neutral-800/50 sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">ID</th>
                    <th className="px-4 py-3">基本資料</th>
                    <th className="px-4 py-3">身分/職業</th>
                    <th className="px-4 py-3">年薪/家庭所得</th>
                    <th className="px-4 py-3">居住地</th>
                    <th className="px-4 py-3">交通工具</th>
                    <th className="px-4 py-3 rounded-tr-lg">目前狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAgents.map((agent) => (
                    <tr 
                      key={agent.id} 
                      className="border-b border-neutral-800 hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <td className="px-4 py-4 font-mono text-neutral-400 group-hover:text-indigo-400 transition-colors">{agent.id}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-white">{agent.age}歲</span>
                          <span className="text-xs text-neutral-500">{agent.gender === 'M' ? '男' : '女'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          agent.occupation === 'Worker' ? 'bg-blue-500/20 text-blue-300' :
                          agent.occupation === 'Student' ? 'bg-emerald-500/20 text-emerald-300' :
                          agent.occupation === 'Retiree' ? 'bg-purple-500/20 text-purple-300' :
                          'bg-neutral-500/20 text-neutral-300'
                        }`}>
                          {agent.occupation}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1 text-sm">
                          <span className="text-emerald-400">${(agent.salary/10000).toFixed(1)}萬</span>
                          <span className="text-xs text-neutral-500">家: ${(agent.household_income/10000).toFixed(1)}萬</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium">{getNodeName(agent.home_village)}</td>
                      <td className="px-4 py-4 text-neutral-400">{agent.vehicle_ownership}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-neutral-300">{getNodeName(agent.currentLocation)}</span>
                          <span className="text-xs text-indigo-400 flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${agent.currentLocation === agent.home_village ? 'bg-neutral-500' : 'bg-indigo-500 animate-pulse'}`} />
                            {agent.currentActivity || (agent.currentLocation === agent.home_village ? '在家休息' : '活動中')}
                          </span>
                        </div>
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
          </>
        ) : (
          <div className="flex-1 overflow-auto p-6 bg-neutral-900 flex flex-col">
            <button 
              onClick={() => setSelectedAgent(null)} 
              className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-6 w-fit transition-colors"
            >
              <ChevronLeft size={20} />
              返回列表
            </button>
            
            <div className="flex flex-col gap-8 max-w-3xl mx-auto w-full pb-8">
              {/* Basic Info Card */}
              <div className="bg-neutral-800/40 p-6 rounded-2xl border border-neutral-700/50 flex flex-wrap gap-8 items-center shadow-lg">
                <div className="w-16 h-16 shrink-0 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl font-bold">
                  {selectedAgent.occupation[0]}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm text-neutral-500 mb-1">Agent ID: <span className="font-mono text-neutral-300">{selectedAgent.id}</span></p>
                  <p className="text-lg font-medium text-white">{selectedAgent.age}歲, {selectedAgent.gender === 'M' ? '男性' : '女性'}</p>
                  <p className="text-neutral-300">{selectedAgent.occupation} <span className="text-emerald-400 ml-2">${(selectedAgent.salary/10000).toFixed(1)}萬</span></p>
                </div>
                <div className="flex flex-col gap-3 min-w-[200px]">
                   <div className="flex items-center justify-between text-xs">
                     <span className="text-neutral-500">消費意願 (Thrifty)</span>
                     <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500" style={{ width: `${selectedAgent.traits.thriftiness * 100}%` }} />
                     </div>
                   </div>
                   <div className="flex items-center justify-between text-xs">
                     <span className="text-neutral-500">社交需求 (Social)</span>
                     <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                       <div className="h-full bg-orange-500" style={{ width: `${selectedAgent.traits.socialMobility * 100}%` }} />
                     </div>
                   </div>
                   <div className="flex items-center justify-between text-xs">
                     <span className="text-neutral-500">駕駛偏好 (Drive)</span>
                     <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500" style={{ width: `${selectedAgent.traits.carPreference * 100}%` }} />
                     </div>
                   </div>
                </div>
              </div>

              {/* LLM Narrative */}
              <div className="bg-indigo-500/5 p-6 rounded-2xl border border-indigo-500/20 relative">
                <div className="absolute -top-3 left-6 px-3 bg-neutral-900 text-indigo-400 text-xs font-bold tracking-widest uppercase">
                  LLM Behavioral Profile
                </div>
                <p className="text-neutral-200 italic leading-relaxed">
                  "{selectedAgent.description}"
                </p>
              </div>
              
              {/* Timeline */}
              <div>
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                  今日行程 (Daily Trip Chain)
                </h3>
                
                <div className="flex flex-col gap-6 relative ml-6">
                  {/* Vertical line */}
                  <div className="absolute top-4 bottom-4 left-0 w-0.5 bg-neutral-800 -ml-px" />
                  
                  {getSortedSchedule(selectedAgent).map((trip, idx) => (
                    <div key={idx} className="flex gap-6 relative z-10">
                      <div className="w-12 h-12 shrink-0 rounded-full bg-neutral-900 border-4 border-neutral-800 flex items-center justify-center font-bold text-indigo-400 -ml-6 shadow-xl">
                        {trip.departureHour.toString().padStart(2, '0')}
                      </div>
                      <div className="flex-1 bg-neutral-800/30 hover:bg-neutral-800/50 transition-colors p-5 rounded-2xl border border-neutral-700/30">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-lg font-medium text-white">{trip.type}</h4>
                          <span className="text-xs font-medium bg-neutral-700 text-neutral-300 px-2.5 py-1 rounded-md shadow-sm">
                            {trip.vehicle}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-neutral-400">
                          <div className="px-3 py-1.5 bg-neutral-900/50 rounded-lg">{getNodeName(trip.origin)}</div>
                          <span>→</span>
                          <div className="px-3 py-1.5 bg-neutral-900/50 rounded-lg">{getNodeName(trip.destination)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {getSortedSchedule(selectedAgent).length === 0 && (
                    <div className="bg-neutral-800/30 p-6 rounded-2xl border border-neutral-700/30 text-center text-neutral-400 relative z-10 ml-6">
                      此代理人今日無外出行程，一整天都在家休息。
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
