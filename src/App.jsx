import React, { useState, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import MainMap from './components/MainMap';
import AnalyticsPanel from './components/AnalyticsPanel';
import AgentListModal from './components/AgentListModal';
import { generateSimulationData } from './lib/simulation';

function App() {
  const [day, setDay] = useState(1);
  const [scenario, setScenario] = useState('baseline');
  const [agents, setAgents] = useState(5000);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simData, setSimData] = useState(null);
  const [simHistory, setSimHistory] = useState([]);
  const [showAgentList, setShowAgentList] = useState(false);
  const [batchDays, setBatchDays] = useState(30);

  useEffect(() => {
    if (day === 1) {
      const initialData = generateSimulationData(day, scenario, agents);
      setSimData(initialData);
      setSimHistory([{ 
        day: 1, 
        totalTrips: initialData.stats.totalTrips, 
        avgTravelTime: initialData.stats.avgTravelTime 
      }]);
    }
  }, [day, scenario, agents]);

  const handleRunSimulation = () => {
    setIsPlaying(true);
    setTimeout(() => {
      const nextDay = day + 1;
      const newData = generateSimulationData(nextDay, scenario, agents);
      setDay(nextDay);
      setSimData(newData);
      setSimHistory(prev => [...prev, {
        day: nextDay,
        totalTrips: newData.stats.totalTrips,
        avgTravelTime: newData.stats.avgTravelTime
      }]);
      setIsPlaying(false);
    }, 1500);
  };

  const handleBatchSimulation = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    
    let currentDay = day;
    let history = [...simHistory];
    let latestData = simData;

    for (let i = 0; i < batchDays; i++) {
      currentDay++;
      latestData = generateSimulationData(currentDay, scenario, agents);
      history.push({
        day: currentDay,
        totalTrips: latestData.stats.totalTrips,
        avgTravelTime: latestData.stats.avgTravelTime
      });
      
      setDay(currentDay);
      setSimData(latestData);
      setSimHistory([...history]);
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    setIsPlaying(false);
  };

  const handleReset = () => {
    setDay(1);
    setScenario('baseline');
    setAgents(5000);
    const initialData = generateSimulationData(1, 'baseline', 5000);
    setSimData(initialData);
    setSimHistory([{ 
      day: 1, 
      totalTrips: initialData.stats.totalTrips, 
      avgTravelTime: initialData.stats.avgTravelTime 
    }]);
    setIsPlaying(false);
  };

  return (
    <div className="relative w-full h-screen bg-neutral-950 font-sans overflow-hidden text-neutral-200">
      
      {/* Full Screen Background Map */}
      <div className="absolute inset-0 z-0">
        {simData && (
          <MainMap 
            nodes={simData.nodes} 
            links={simData.links} 
            isPlaying={isPlaying} 
          />
        )}
      </div>

      {/* Floating Control Panel (Left) */}
      <div className="absolute top-8 left-8 bottom-8 w-80 z-10 pointer-events-none">
        <div className="h-full pointer-events-auto rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-neutral-800/50 backdrop-blur-md bg-neutral-900/80">
          <ControlPanel 
            day={day}
            scenario={scenario}
            agents={agents}
            isPlaying={isPlaying}
            batchDays={batchDays}
            onRunSimulation={handleRunSimulation}
            onRunBatch={handleBatchSimulation}
            onReset={handleReset}
            onScenarioChange={setScenario}
            onAgentsChange={setAgents}
            onBatchDaysChange={setBatchDays}
            onShowAgentList={() => setShowAgentList(true)}
          />
        </div>
      </div>

      {/* Floating Analytics Panel (Right) */}
      <div className="absolute top-8 right-8 bottom-8 w-80 z-10 pointer-events-none">
        <div className="h-full pointer-events-auto rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-neutral-800/50 backdrop-blur-md bg-neutral-900/80">
          <AnalyticsPanel stats={simData?.stats} simHistory={simHistory} />
        </div>
      </div>

      {/* Modal */}
      {showAgentList && simData && (
        <AgentListModal 
          agents={simData.agents} 
          nodes={simData.nodes}
          onClose={() => setShowAgentList(false)} 
        />
      )}

    </div>
  )
}

export default App;
