# LLM-ABM: Tainan Traffic Simulation Project Context

## Project Overview
The **LLM-ABM (Agent-Based Model) Tainan Traffic Simulator** is an interactive, web-based platform designed to simulate micro-level, agent-based traffic flows across the villages (村里) of Tainan City. The simulation runs on an **hour-by-hour** scale, allowing users to visualize realistic daily movement cycles, including morning commutes (home-to-destination), daytime off-peak activities, and evening returns (destination-to-home).

The system integrates real-world demographic distributions and calculates destination attraction scores using OpenStreetMap (OSM) Point-of-Interest (POI) data to create highly realistic trip chains for different demographics (Workers, Students, Retirees). 

## Technology Stack
- **Frontend Framework:** React + Vite
- **Styling:** TailwindCSS
- **Geospatial & Visualization:** D3.js (`d3-geo`) for map projections, Recharts for data analytics
- **Map Interaction:** `react-zoom-pan-pinch` for smooth, Google Maps-like zooming and panning.
- **Data Preprocessing:** Python (`geopandas`, `requests` for OSM overpass API) via `process_shp.py`.
- **Build Target:** A single, standalone HTML file (`TainanTrafficSim.html`) generated via `vite-plugin-singlefile` for easy distribution and offline viewing.

## Directory Structure
- `process_shp.py`: Python script used to process Tainan shapefiles, query OSM for POIs to calculate attraction scores, build the graph adjacency list, and generate the required JSON files for the frontend.
- `public/`:
  - `villages.json` / `villages.geojson`: Tainan village boundaries for map rendering.
  - `network.json`: Precomputed spatial network data including nodes (villages with population/attraction), links, and adjacency lists.
- `src/`:
  - `App.jsx`: Main React component. Orchestrates simulation state (`hour`, `scenario`) and manages the layout of the full-screen map and floating UI panels.
  - `lib/simulation.js`: Core simulation logic. Handles dynamic agent generation based on population (1 agent = 100 people), trip routing (greedy route calculation), and time-based movement probability based on the current hour of the day.
  - `components/MainMap.jsx`: The central SVG map. Uses D3 to project GeoJSON, displays village congestion levels, and animates active traffic flows along paths.
  - `components/ControlPanel.jsx`: Left-side floating panel for controlling time, adjusting simulation parameters, and triggering hourly or batch simulation runs.
  - `components/AnalyticsPanel.jsx`: Right-side floating panel using Recharts to visualize live simulation stats (total trips, travel time, mode share, historical trend, and congestion rankings).
  - `components/AgentListModal.jsx`: A modal overlay showing detailed metadata and live status of active agents.
- `TainanTrafficSim.html`: The final built output. After running `npm run build`, the `dist/index.html` is copied here.

## Core Mechanisms
1. **Time Scale (Hour-by-Hour):**
   The simulation uses `hour % 24` to determine behavioral states. 
   - 07:00-09:00: Morning peak (Workers/Students commute).
   - 10:00-16:00: Daytime activities (Agents at destination; Retirees move around).
   - 17:00-19:00: Evening peak (Workers/Students return home).
   - 20:00-06:00: Nighttime (Low traffic, agents at home).
   
2. **Simulation Data Generation (`simulation.js`):**
   The `generateSimulationData` function is called every tick. It first generates agents dynamically based on each village's real population (creating 1 agent per 100 people). It calculates the current location and intended destination of every agent, runs `greedyRoute` to find the shortest path between adjacent villages, and increments the `flow` and `congestion` statistics for nodes and links. Since each agent represents 100 people, all resulting traffic volumes and flows are multiplied by 100 to maintain realistic scale while minimizing computation overhead.

3. **Rendering Pipeline (`MainMap.jsx`):**
   - Renders polygons for villages. Colors are determined by the village's calculated `congestion` metric.
   - Active traffic routes are drawn as glowing, dashed SVG lines that animate along the path between villages.
   - Zooming is constrained between 0.2x and 30x/50x using standard scrolling increments to provide a smooth exploration experience.

## Build Process
Because the primary deliverable is often the standalone HTML file:
1. Run `npm run build`.
2. Vite uses `vite-plugin-singlefile` to inline all CSS and JS into `dist/index.html`.
3. The resulting `dist/index.html` is typically copied to `TainanTrafficSim.html` in the root directory for direct browser viewing.

## Known Modifiers & Scenarios
- **Baseline:** Standard travel times and mode shares.
- **High Temp (高溫炎熱):** Increases the use of cars vs active transport, multiplying overall travel time (`travelTimeModifier = 1.2`).
- **Congestion (壅塞敏感):** Substantially decreases network efficiency, increasing simulated travel times (`travelTimeModifier = 1.5`).

## AI Guidelines (Crucial)
The user interacts with this project by opening the standalone HTML file directly (typically `TainanTrafficSim.html` or `dist/index.html`) via the browser's file protocol, **NOT** via a terminal dev server.

**Therefore, for EVERY change made to the `src/` directory, you MUST:**
1. Run `npm run build` to compile the changes.
2. Synchronize the output by running `Copy-Item dist\index.html TainanTrafficSim.html -Force`.
3. Inform the user that the build is complete and they can refresh their browser to see the changes.

