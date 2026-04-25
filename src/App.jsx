import React, { useState, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import MainMap from './components/MainMap';
import AnalyticsPanel from './components/AnalyticsPanel';
import { generateSimulationData } from './lib/simulation';

function App() {
  const [day, setDay] = useState(1);
  const [scenario, setScenario] = useState('baseline');
  const [agents, setAgents] = useState(5000);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simData, setSimData] = useState(null);

  useEffect(() => {
    if (day === 1) {
      setSimData(generateSimulationData(day, scenario, agents));
    }
  }, [day, scenario, agents]);

  const handleRunSimulation = () => {
    setIsPlaying(true);
    setTimeout(() => {
      setDay(d => d + 1);
      setSimData(generateSimulationData(day + 1, scenario, agents));
      setIsPlaying(false);
    }, 1500);
  };

  const handleReset = () => {
    setDay(1);
    setScenario('baseline');
    setAgents(5000);
    setSimData(generateSimulationData(1, 'baseline', 5000));
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
            onRunSimulation={handleRunSimulation}
            onReset={handleReset}
            onScenarioChange={setScenario}
            onAgentsChange={setAgents}
          />
        </div>
      </div>

      {/* Floating Analytics Panel (Right) */}
      <div className="absolute top-8 right-8 bottom-8 w-80 z-10 pointer-events-none">
        <div className="h-full pointer-events-auto rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-neutral-800/50 backdrop-blur-md bg-neutral-900/80">
          <AnalyticsPanel stats={simData?.stats} />
        </div>
      </div>

    </div>
  )
}

export default App;
