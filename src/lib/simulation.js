import networkData from '../../public/network.json';
import { generateAgents } from './agents';
import { generateAllTripChains } from './tripChain';

const { nodes: baseNodes, links: baseLinks, adjList } = networkData;

// Greedily find path from uId to targetId
function greedyRoute(uId, targetId, nodes) {
  const path = [];
  let curr = uId;
  const visited = new Set([curr]);
  const targetNode = nodes.find(n => n.id === targetId);

  if (!targetNode) return [];

  let hops = 0;
  while (curr !== targetId && hops < 50) {
    hops++;
    const neighbors = adjList[curr];
    if (!neighbors || neighbors.length === 0) break;

    let bestNeighbor = null;
    let minDist = Infinity;

    for (const nId of neighbors) {
      if (visited.has(nId)) continue;
      const nNode = nodes.find(n => n.id === nId);
      if(!nNode) continue;
      const dist = Math.hypot(nNode.cx - targetNode.cx, nNode.cy - targetNode.cy);
      if (dist < minDist) {
        minDist = dist;
        bestNeighbor = nId;
      }
    }

    if (!bestNeighbor) break; // Stuck
    
    const eid = curr < bestNeighbor ? `${curr}-${bestNeighbor}` : `${bestNeighbor}-${curr}`;
    path.push(eid);
    
    curr = bestNeighbor;
    visited.add(curr);
  }
  return path;
}

let cachedAgents = null;

export function generateSimulationData(hour, scenario) {
  if (hour === 0 || !cachedAgents) {
    const rawAgents = generateAgents(baseNodes);
    cachedAgents = generateAllTripChains(rawAgents, baseNodes);
  }

  // Initialize state for the day
  let nodes = baseNodes.map(n => ({
    ...n,
    inflow: 0, 
    outflow: 0, 
    congestion: 0,
    flowThrough: 0,
    activeAgents: 0 // Agents currently visiting this node
  }));
  
  let links = baseLinks.map(l => ({ ...l, flow: 0 }));
  const linkMap = new Map();
  links.forEach(l => linkMap.set(l.id, l));

  let totalTrips = 0;
  const modeCounts = { '汽車': 0, '機車': 0, '大眾運輸': 0, '步行/單車': 0 };

  // Scenario modifier
  let travelTimeModifier = 1.0;
  if (scenario === 'high_temp') travelTimeModifier = 1.2;
  if (scenario === 'congestion') travelTimeModifier = 1.5;

  const hourOfDay = hour % 24;

  // Process Agent Trips based on their explicit schedule
  cachedAgents.forEach(agent => {
    // Find if the agent has a trip departing exactly at this hour
    const trip = agent.schedule.find(t => t.departureHour === hourOfDay);

    if (trip && trip.origin !== trip.destination) {
      // Agent is traveling
      const startNode = trip.origin;
      const endNode = trip.destination;

      const tripPath = greedyRoute(startNode, endNode, nodes);
      if (tripPath.length > 0) {
        totalTrips += 100;
        
        const vehicleUsed = trip.vehicle || '步行/單車';
        if (modeCounts[vehicleUsed] !== undefined) {
          modeCounts[vehicleUsed] += 100;
        } else {
          modeCounts['步行/單車'] += 100; // fallback
        }

        const originObj = nodes.find(n => n.id === startNode);
        const destObj = nodes.find(n => n.id === endNode);
        
        if (originObj) originObj.outflow += 100;
        if (destObj) {
          destObj.inflow += 100;
          destObj.activeAgents += 100; // Agent arriving at dest
        }

        tripPath.forEach(eid => {
          const edge = linkMap.get(eid);
          if (edge) {
            edge.flow += 100;
            const [u, v] = eid.split('-');
            const nodeU = nodes.find(n => n.id === u);
            const nodeV = nodes.find(n => n.id === v);
            if (nodeU) nodeU.flowThrough += 100;
            if (nodeV) nodeV.flowThrough += 100;
          }
        });
      } else {
        // Route not found, stays at origin
        const start = nodes.find(n => n.id === startNode);
        if (start) start.activeAgents += 100;
      }
      
      // Update agent's current location and activity for UI tracking
      agent.currentLocation = endNode;
      agent.currentActivity = trip.type;
    } else {
      // Agent is not traveling this hour, stays at their current location
      const locObj = nodes.find(n => n.id === agent.currentLocation);
      if (locObj) locObj.activeAgents += 100;
    }
  });

  // Calculate congestion and final stats
  nodes = nodes.map(node => {
    // Activity level includes through-traffic and local active agents
    const trafficVolume = node.inflow + node.outflow + (node.flowThrough * 0.5);
    // Tuned for real population scale where traffic volume is closer to population
    let congestion = (trafficVolume / (node.population * 0.8)) * travelTimeModifier;
    if (congestion > 1) congestion = 1;
    
    return { ...node, congestion };
  });

  nodes.sort((a, b) => b.congestion - a.congestion);

  const avgTravelTime = Math.floor((25 + Math.random() * 5) * travelTimeModifier);
  const modeShare = Object.entries(modeCounts).map(([name, value]) => ({ name, value })).filter(m => m.value > 0);

  return {
    nodes,
    links,
    agents: cachedAgents,
    stats: {
      totalTrips,
      avgTravelTime,
      modeShare,
      rankings: nodes.slice(0, 10)
    }
  };
}
