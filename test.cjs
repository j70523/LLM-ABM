const fs = require('fs');

const networkData = JSON.parse(fs.readFileSync('./public/network.json', 'utf-8'));
const { nodes: baseNodes, links: baseLinks, adjList } = networkData;

function greedyRoute(uId, targetId, nodes) {
  const path = [];
  let curr = uId;
  const visited = new Set([curr]);
  const targetNode = nodes.find(n => n.id === targetId);

  let hops = 0;
  while (curr !== targetId && hops < 100) {
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

try {
  console.log("Testing generation...");
  let nodes = baseNodes.map(n => ({...n, inflow: 0, outflow: 0, congestion: 0, flowThrough: 0}));
  let links = baseLinks.map(l => ({ ...l, flow: 0 }));
  const linkMap = new Map();
  links.forEach(l => linkMap.set(l.id, l));

  let totalTrips = 0;
  let edgesUsedCount = 0;

  nodes.forEach(origin => {
    const destIndex = Math.floor(Math.random() * nodes.length);
    const dest = nodes[destIndex];
    if (origin.id === dest.id) return;

    const edgesUsed = greedyRoute(origin.id, dest.id, nodes);
    edgesUsedCount += edgesUsed.length;
    
    edgesUsed.forEach(eid => {
      const edge = linkMap.get(eid);
      if (edge) {
        edge.flow += 1;
      }
    });
  });

  console.log("Total trips:", nodes.length);
  console.log("Total edges used:", edgesUsedCount);
  console.log("Active links:", links.filter(l => l.flow > 0).length);
  
} catch (err) {
  console.error("Error:", err);
}
