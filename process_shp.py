import geopandas as gpd
import json
import numpy as np

# Load shapefile
print("Loading Shapefile...")
gdf = gpd.read_file('data/研究範圍村里統計區/研究範圍村里統計區.shp')

# Reproject to WGS84 for web mapping
print("Reprojecting to EPSG:4326...")
gdf = gdf.to_crs(epsg=4326)

# Create a unique ID for each village
gdf['id'] = gdf['VILLCODE']

# Calculate centroids
gdf['centroid'] = gdf.geometry.centroid
gdf['cx'] = gdf.centroid.x
gdf['cy'] = gdf.centroid.y

# Assign mock population (or read if exists, but we'll mock it)
np.random.seed(42)
gdf['population'] = np.random.randint(500, 3000, size=len(gdf))

# Calculate Adjacency
print("Calculating Adjacency...")
adj_list = {}
edges = []
edge_set = set()

# Optimization: use spatial index
sindex = gdf.sindex

for idx, row in gdf.iterrows():
    u_id = row['id']
    adj_list[u_id] = []
    
    # Find possible neighbors using spatial index
    possible_matches_index = list(sindex.intersection(row.geometry.bounds))
    possible_matches = gdf.iloc[possible_matches_index]
    
    # Precise intersection/touches
    precise_matches = possible_matches[possible_matches.geometry.touches(row.geometry)]
    
    for _, neighbor in precise_matches.iterrows():
        v_id = neighbor['id']
        adj_list[u_id].append(v_id)
        
        # Add to edges
        eid = f"{u_id}-{v_id}" if u_id < v_id else f"{v_id}-{u_id}"
        if eid not in edge_set:
            edge_set.add(eid)
            edges.append({
                'id': eid,
                'source': u_id,
                'target': v_id,
                'flow': 0
            })

print(f"Generated {len(gdf)} nodes and {len(edges)} edges.")

# Export Network Data for Simulation Engine
print("Exporting network.json...")
nodes = []
for idx, row in gdf.iterrows():
    nodes.append({
        'id': row['id'],
        'name': f"{row['TOWNNAME']}{row['VILLNAME']}",
        'cx': row['cx'],
        'cy': row['cy'],
        'population': int(row['population'])
    })

network_data = {
    'nodes': nodes,
    'links': edges,
    'adjList': adj_list
}

with open('public/network.json', 'w', encoding='utf-8') as f:
    json.dump(network_data, f, ensure_ascii=False)

# Export GeoJSON for Map Rendering
print("Exporting villages.geojson...")
# Keep only necessary columns for GeoJSON to save space
gdf_export = gdf[['id', 'TOWNNAME', 'VILLNAME', 'population', 'geometry']].copy()
gdf_export.to_file('public/villages.geojson', driver='GeoJSON', encoding='utf-8')

print("Done!")
