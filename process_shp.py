import geopandas as gpd
import pandas as pd
import json
import numpy as np
import requests
from shapely.geometry import Point

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

# Load real population data from CSV
print("Loading Population Data...")
pop_df = pd.read_csv('data/STAT (1)/114年12月行政區人口統計_村里_臺南市.csv', skiprows=[1])
gdf = gdf.merge(pop_df[['TOWN', 'VILLAGE', 'P_CNT']], left_on=['TOWNNAME', 'VILLNAME'], right_on=['TOWN', 'VILLAGE'], how='left')
gdf['population'] = gdf['P_CNT'].fillna(500).astype(int) # Default 500 if missing
print(f"Mapped population for {gdf['P_CNT'].notna().sum()} out of {len(gdf)} villages.")

# Fetch POI from OSM to calculate attraction score
print("Fetching POI data from OpenStreetMap...")
bbox = gdf.total_bounds # [minx, miny, maxx, maxy] -> [min_lon, min_lat, max_lon, max_lat]
overpass_query = f"""
[out:json][timeout:50];
(
  node["amenity"]({bbox[1]},{bbox[0]},{bbox[3]},{bbox[2]});
  node["shop"]({bbox[1]},{bbox[0]},{bbox[3]},{bbox[2]});
  node["office"]({bbox[1]},{bbox[0]},{bbox[3]},{bbox[2]});
  node["tourism"]({bbox[1]},{bbox[0]},{bbox[3]},{bbox[2]});
);
out center;
"""
try:
    response = requests.post("https://overpass-api.de/api/interpreter", data={'data': overpass_query}, headers={'User-Agent': 'TainanABM/1.0'})
    data = response.json()
    print(f"Fetched {len(data.get('elements', []))} POIs from OSM.")
    pois = [Point(e['lon'], e['lat']) for e in data.get('elements', []) if 'lat' in e and 'lon' in e]
    if pois:
        pois_gdf = gpd.GeoDataFrame(geometry=pois, crs="EPSG:4326")
        joined = gpd.sjoin(gdf, pois_gdf, how="left", predicate="intersects")
        poi_counts = joined.groupby('id').size()
        # Some might be 1 even if 0 pois because of left join counting the NaNs. Wait, groupby size on left join counts rows, including NaNs!
        # We should drop NaNs before groupby, or use count('index_right')
        poi_counts = joined.groupby('id')['index_right'].count()
        gdf['attraction'] = gdf['id'].map(poi_counts).fillna(0) + 1 # +1 as baseline so nowhere is 0
    else:
        gdf['attraction'] = 1
except Exception as e:
    print(f"Failed to fetch OSM data: {e}")
    gdf['attraction'] = 1


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
        'population': int(row['population']),
        'attraction': int(row.get('attraction', 1))
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
