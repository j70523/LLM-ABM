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

# Load real population data from CSV (includes M_CNT / F_CNT for gender ratio)
print("Loading Population Data...")
pop_df = pd.read_csv('data/STAT (1)/114年12月行政區人口統計_村里_臺南市.csv', skiprows=[1], encoding='utf-8-sig')
gdf = gdf.merge(
    pop_df[['TOWN', 'VILLAGE', 'P_CNT', 'M_CNT', 'F_CNT']],
    left_on=['TOWNNAME', 'VILLNAME'],
    right_on=['TOWN', 'VILLAGE'],
    how='left'
)
gdf['population'] = gdf['P_CNT'].fillna(500).astype(int)   # Default 500 if missing
gdf['male_cnt']   = gdf['M_CNT'].fillna(0).astype(int)
gdf['female_cnt'] = gdf['F_CNT'].fillna(0).astype(int)
# Calculate male ratio (0~1); fallback to 0.5 when population is 0
gdf['male_ratio'] = np.where(
    gdf['population'] > 0,
    gdf['male_cnt'] / gdf['population'],
    0.5
)
print(f"Mapped population for {gdf['P_CNT'].notna().sum()} out of {len(gdf)} villages.")

# Load village income data (單位: 千元/年)
print("Loading Income Data...")
inc_df = pd.read_excel('data/村里所得.xlsx', header=0)
inc_df['district'] = inc_df['縣市別'].str.replace('臺南市', '', regex=False)
gdf = gdf.merge(
    inc_df[['district', '村里', '平均數', '中位數', '第一分位數', '第三分位數']],
    left_on=['TOWNNAME', 'VILLNAME'],
    right_on=['district', '村里'],
    how='left'
)
# Rename to English-friendly field names; fill missing with Tainan city-wide averages
gdf['income_mean'] = gdf['平均數'].fillna(750).astype(int)   # 千元/年, fallback ~750
gdf['income_median'] = gdf['中位數'].fillna(500).astype(int)
gdf['income_q1'] = gdf['第一分位數'].fillna(280).astype(int)
gdf['income_q3'] = gdf['第三分位數'].fillna(1000).astype(int)
print(f"Mapped income for {gdf['平均數'].notna().sum()} out of {len(gdf)} villages.")

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
        'attraction': int(row.get('attraction', 1)),
        # Real gender ratio from population registry
        'male_ratio': round(float(row['male_ratio']), 4),
        # Village income distribution (千元/年)
        'income_mean':   int(row['income_mean']),
        'income_median': int(row['income_median']),
        'income_q1':     int(row['income_q1']),
        'income_q3':     int(row['income_q3']),
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
