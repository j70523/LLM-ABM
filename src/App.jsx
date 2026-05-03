import React, { useState, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import MainMap from './components/MainMap';
import AnalyticsPanel from './components/AnalyticsPanel';
import AgentListModal from './components/AgentListModal';
import { generateSimulationData } from './lib/simulation';

function App() {
  const [hour, setHour] = useState(0);
  const [scenario, setScenario] = useState('baseline');
  const [isPlaying, setIsPlaying] = useState(false);
  const [simData, setSimData] = useState(null);
  const [simHistory, setSimHistory] = useState([]);
  const [showAgentList, setShowAgentList] = useState(false);
  const [batchHours, setBatchHours] = useState(24);

  useEffect(() => {
    if (hour === 0) {
      const initialData = generateSimulationData(hour, scenario);
      setSimData(initialData);
      setSimHistory([{ 
        hour: 0, 
        totalTrips: initialData.stats.totalTrips, 
        avgTravelTime: initialData.stats.avgTravelTime 
      }]);
    }
  }, [hour, scenario]);

  const handleRunSimulation = () => {
    setIsPlaying(true);
    setTimeout(() => {
      const nextHour = hour + 1;
      const newData = generateSimulationData(nextHour, scenario);
      setHour(nextHour);
      setSimData(newData);
      setSimHistory(prev => [...prev, {
        hour: nextHour,
        totalTrips: newData.stats.totalTrips,
        avgTravelTime: newData.stats.avgTravelTime
      }]);
      setIsPlaying(false);
    }, 1500);
  };

  const handleBatchSimulation = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    
    let currentHour = hour;
    let history = [...simHistory];
    let latestData = simData;

    for (let i = 0; i < batchHours; i++) {
      currentHour++;
      latestData = generateSimulationData(currentHour, scenario);
      history.push({
        hour: currentHour,
        totalTrips: latestData.stats.totalTrips,
        avgTravelTime: latestData.stats.avgTravelTime
      });
      
      setHour(currentHour);
      setSimData(latestData);
      setSimHistory([...history]);
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    setIsPlaying(false);
  };

  const handleReset = () => {
    setHour(0);
    setScenario('baseline');
    const initialData = generateSimulationData(0, 'baseline');
    setSimData(initialData);
    setSimHistory([{ 
      hour: 0, 
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
            hour={hour}
            scenario={scenario}
            isPlaying={isPlaying}
            batchHours={batchHours}
            onRunSimulation={handleRunSimulation}
            onRunBatch={handleBatchSimulation}
            onReset={handleReset}
            onScenarioChange={setScenario}
            onBatchHoursChange={setBatchHours}
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
