import networkData from '../../public/network.json';

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

// Generate Agent Profiles based on totalAgents
function generateAgents(totalAgents, nodes, worldPopulation) {
  const agents = [];
  
  // Create a cumulative probability array for assigning home nodes based on population
  const popThresholds = [];
  let cumulative = 0;
  for (const node of nodes) {
    cumulative += node.population / worldPopulation;
    popThresholds.push({ id: node.id, threshold: cumulative });
  }

  for (let i = 0; i < totalAgents; i++) {
    const randNode = Math.random();
    const homeNode = popThresholds.find(t => randNode <= t.threshold)?.id || nodes[0].id;
    
    const randType = Math.random();
    let type, vehicle;
    if (randType < 0.6) {
      type = 'Worker';
      vehicle = Math.random() < 0.4 ? '汽車' : (Math.random() < 0.8 ? '機車' : '大眾運輸');
    } else if (randType < 0.8) {
      type = 'Student';
      vehicle = Math.random() < 0.5 ? '機車' : (Math.random() < 0.8 ? '大眾運輸' : '步行/單車');
    } else {
      type = 'Retiree';
      vehicle = Math.random() < 0.5 ? '步行/單車' : (Math.random() < 0.8 ? '機車' : '大眾運輸');
    }

    agents.push({
      id: `agent_${i}`,
      homeNode,
      type,
      vehicle
    });
  }
  
  return agents;
}

export function generateSimulationData(day, scenario, totalAgents) {
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

  const worldPopulation = nodes.reduce((sum, n) => sum + n.population, 0);

  // Generate Agents
  const agents = generateAgents(totalAgents, nodes, worldPopulation);

  let totalTrips = 0;
  const modeCounts = { '汽車': 0, '機車': 0, '大眾運輸': 0, '步行/單車': 0 };

  // Scenario modifier
  let travelTimeModifier = 1.0;
  if (scenario === 'high_temp') travelTimeModifier = 1.2;
  if (scenario === 'congestion') travelTimeModifier = 1.5;

  // Process Agent Trips
  agents.forEach(agent => {
    // Determine Destination based on type
    let destNodeId = agent.homeNode;
    
    if (agent.type === 'Worker' || agent.type === 'Student') {
      // Commuters travel further (completely random node for simplicity)
      const randIdx = Math.floor(Math.random() * nodes.length);
      destNodeId = nodes[randIdx].id;
    } else if (agent.type === 'Retiree') {
      // Retirees travel to nearby nodes
      const neighbors = adjList[agent.homeNode];
      if (neighbors && neighbors.length > 0) {
        const randIdx = Math.floor(Math.random() * neighbors.length);
        destNodeId = neighbors[randIdx];
      }
    }

    // If destination is same as home, no inter-village travel
    if (agent.homeNode === destNodeId) {
      const home = nodes.find(n => n.id === agent.homeNode);
      if (home) home.activeAgents += 1;
      return;
    }

    // Simulate Trip: Home -> Destination (1 trip) and Destination -> Home (1 trip)
    // We will accumulate flow for both directions
    const tripPath = greedyRoute(agent.homeNode, destNodeId, nodes);
    const returnPath = greedyRoute(destNodeId, agent.homeNode, nodes);
    
    // Valid trip
    if (tripPath.length > 0) {
      totalTrips += 2; // Round trip
      modeCounts[agent.vehicle] += 2;

      const originNode = nodes.find(n => n.id === agent.homeNode);
      const destNodeObj = nodes.find(n => n.id === destNodeId);
      
      if (originNode) originNode.outflow += 1;
      if (destNodeObj) {
        destNodeObj.inflow += 1;
        destNodeObj.activeAgents += 1; // Agent is currently at destination
      }

      // Add edge flows
      [...tripPath, ...returnPath].forEach(eid => {
        const edge = linkMap.get(eid);
        if (edge) {
          edge.flow += 1;
          const [u, v] = eid.split('-');
          const nodeU = nodes.find(n => n.id === u);
          const nodeV = nodes.find(n => n.id === v);
          if (nodeU) nodeU.flowThrough += 1;
          if (nodeV) nodeV.flowThrough += 1;
        }
      });
    } else {
      // Stayed home if path finding failed
      const home = nodes.find(n => n.id === agent.homeNode);
      if (home) home.activeAgents += 1;
    }
  });

  // Calculate congestion and final stats
  nodes = nodes.map(node => {
    // Activity level includes through-traffic and local active agents
    const trafficVolume = node.inflow + node.outflow + (node.flowThrough * 0.5);
    // Formula tuned for 442 nodes to show nice color spread
    let congestion = (trafficVolume / (node.population * 0.1)) * travelTimeModifier;
    if (congestion > 1) congestion = 1;
    
    return { ...node, congestion };
  });

  nodes.sort((a, b) => b.congestion - a.congestion);

  const avgTravelTime = Math.floor((25 + Math.random() * 5) * travelTimeModifier);
  const modeShare = Object.entries(modeCounts).map(([name, value]) => ({ name, value })).filter(m => m.value > 0);

  return {
    nodes,
    links,
    stats: {
      totalTrips,
      avgTravelTime,
      modeShare,
      rankings: nodes.slice(0, 10)
    }
  };
}
