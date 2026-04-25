import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import * as d3 from 'd3-geo';
import geoData from '../../public/villages.json';

export default function MainMap({ nodes, links, isPlaying }) {
  const width = 1000;
  const height = 1000;

  // Setup D3 Projection
  const { pathGenerator, projection } = useMemo(() => {
    const proj = d3.geoMercator().fitSize([width, height], geoData);
    const path = d3.geoPath().projection(proj);
    return { pathGenerator: path, projection: proj };
  }, []);

  // Compute stats for normalizing flow
  const { maxFlow, activeLinks } = useMemo(() => {
    let max = 1;
    const active = [];
    links.forEach(l => {
      if (l.flow > 0) {
        if (l.flow > max) max = l.flow;
        active.push(l);
      }
    });
    return { maxFlow: max, activeLinks: active };
  }, [links]);

  const getCongestionColor = (val) => {
    if (val < 0.2) return "fill-emerald-500 stroke-emerald-600";
    if (val < 0.5) return "fill-yellow-400 stroke-yellow-500";
    if (val < 0.8) return "fill-orange-500 stroke-orange-600";
    return "fill-red-500 stroke-red-600";
  };

  const [selectedNode, setSelectedNode] = useState(null);

  // Click outside to deselect
  const handleSvgClick = (e) => {
    if (e.target.tagName === 'svg') {
      setSelectedNode(null);
    }
  };

  return (
    <div className="relative w-full h-full bg-neutral-950 overflow-hidden flex flex-col items-center justify-center">
      {/* Background grid */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none" 
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={10}
        wheel={{ step: 0.05, smoothStep: 0.005 }} // Google Maps style smooth zoom
        doubleClick={{ mode: "zoomIn" }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute bottom-8 right-8 z-50 flex flex-col gap-2 shadow-2xl">
              <button onClick={() => zoomIn()} className="p-3 bg-neutral-800/90 backdrop-blur hover:bg-neutral-700 rounded-t-xl text-white border-b border-neutral-700">
                <ZoomIn size={20} />
              </button>
              <button onClick={() => resetTransform()} className="p-3 bg-neutral-800/90 backdrop-blur hover:bg-neutral-700 text-white">
                <Maximize size={20} />
              </button>
              <button onClick={() => zoomOut()} className="p-3 bg-neutral-800/90 backdrop-blur hover:bg-neutral-700 rounded-b-xl text-white border-t border-neutral-700">
                <ZoomOut size={20} />
              </button>
            </div>

            <TransformComponent wrapperClass="w-full h-full cursor-grab active:cursor-grabbing" contentClass="w-full h-full">
              <svg onClick={handleSvgClick} viewBox={`0 0 ${width} ${height}`} className="w-full h-full min-w-[100vw] min-h-[100vh]">
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Draw Base Village Polygons */}
                <g className="villages">
                  {geoData.features.map((feature, i) => {
                    const d = pathGenerator(feature);
                    const node = nodes.find(n => n.id === feature.properties.id);
                    const congestion = node ? node.congestion : 0;
                    return (
                      <path
                        key={`poly-${i}`}
                        d={d}
                        className={clsx(
                          "transition-colors duration-1000 opacity-20 hover:opacity-40 stroke-[0.5] stroke-white/20 cursor-pointer",
                          getCongestionColor(congestion)
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNode(node);
                        }}
                      />
                    );
                  })}
                </g>

                {/* Draw active flows */}
                {activeLinks.map((link) => {
                  const source = nodes.find(n => n.id === link.source);
                  const target = nodes.find(n => n.id === link.target);
                  if (!source || !target) return null;

                  const [x1, y1] = projection([source.cx, source.cy]);
                  const [x2, y2] = projection([target.cx, target.cy]);

                  const intensity = link.flow / maxFlow;
                  const strokeWidth = 1 + intensity * 6;
                  const isHeavy = intensity > 0.4;

                  return (
                    <g key={`active-${link.id}`}>
                      <line
                        x1={x1} y1={y1}
                        x2={x2} y2={y2}
                        className={clsx(
                          "transition-all duration-1000",
                          isHeavy ? "stroke-blue-400" : "stroke-blue-500/60"
                        )}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${strokeWidth * 1.5} ${strokeWidth * 3}`}
                        style={{
                          animation: 'dash 1s linear infinite'
                        }}
                        filter={isHeavy ? "url(#glow)" : ""}
                      />
                    </g>
                  );
                })}

                {/* Draw Nodes (Villages Centroids) */}
                {nodes.map((node) => {
                  const [x, y] = projection([node.cx, node.cy]);
                  return (
                    <g key={`node-${node.id}`} className="pointer-events-none">
                      <circle 
                        cx={x} 
                        cy={y} 
                        r={1.5 + node.congestion * 3} 
                        className={clsx(
                          "stroke-[0.5] transition-colors duration-500",
                          getCongestionColor(node.congestion)
                        )}
                      />
                    </g>
                  );
                })}
              </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Floating Tooltip */}
      {selectedNode && (
        <div className="absolute top-8 right-[340px] z-50 bg-neutral-900/95 backdrop-blur border border-neutral-700 p-5 rounded-2xl shadow-2xl pointer-events-auto min-w-[200px]">
          <h3 className="text-white font-bold text-xl mb-1">{selectedNode.name}</h3>
          <div className="mt-4 text-sm text-neutral-300 space-y-2">
            <p className="flex justify-between">
              <span>村里總人口:</span> 
              <span className="text-white font-mono">{selectedNode.population.toLocaleString()} 人</span>
            </p>
            <p className="flex justify-between">
              <span>目前活躍 Agents:</span> 
              <span className="text-blue-400 font-bold font-mono">{selectedNode.activeAgents.toLocaleString()} 人</span>
            </p>
            <div className="h-px bg-neutral-800 my-2" />
            <p className="flex justify-between">
              <span>當下壅塞度:</span> 
              <span className={clsx("font-bold font-mono", selectedNode.congestion > 0.8 ? "text-red-400" : "text-yellow-400")}>
                {(selectedNode.congestion * 100).toFixed(0)}%
              </span>
            </p>
          </div>
          <button 
            onClick={() => setSelectedNode(null)}
            className="mt-4 w-full py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs text-neutral-400"
          >
            關閉面板
          </button>
        </div>
      )}

      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -30; }
        }
      `}</style>
    </div>
  );
}
