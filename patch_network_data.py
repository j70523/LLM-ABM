"""
patch_network_data.py
─────────────────────────────────────────────────────────────────────────────
快速補丁腳本：將村里所得 + 性別比例注入現有的 public/network.json，
不需要重跑完整的 process_shp.py（不需要 OSM 查詢、不需要重算鄰接關係）。

資料來源:
  • data/STAT (1)/114年12月行政區人口統計_村里_臺南市.csv  → M_CNT, F_CNT
  • data/村里所得.xlsx                                    → 平均數, 中位數, 第一/三分位數

輸出:
  • public/network.json  （原地更新，舊檔自動備份為 network.json.bak）
─────────────────────────────────────────────────────────────────────────────
"""
import json
import shutil
import sys
import pandas as pd
import numpy as np
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

# ── Paths ──────────────────────────────────────────────────────────────────
NETWORK_JSON  = Path('public/network.json')
POP_CSV       = Path('data/STAT (1)/114年12月行政區人口統計_村里_臺南市.csv')
INCOME_XLSX   = Path('data/村里所得.xlsx')

# ── Tainan city-wide fallback values (千元/年) when a village has no income data
FALLBACK_MEAN   = 750
FALLBACK_MEDIAN = 500
FALLBACK_Q1     = 280
FALLBACK_Q3     = 1000

# ── Load existing network.json ──────────────────────────────────────────────
print(f"Loading {NETWORK_JSON} ...")
backup = NETWORK_JSON.with_suffix('.json.bak')
shutil.copy(NETWORK_JSON, backup)
print(f"  Backup saved → {backup}")

with open(NETWORK_JSON, encoding='utf-8') as f:
    network = json.load(f)

nodes = network['nodes']
print(f"  {len(nodes)} nodes found.")

# ── Load population CSV (gender counts) ────────────────────────────────────
print(f"\nLoading population data from {POP_CSV} ...")
pop_df = pd.read_csv(POP_CSV, skiprows=[1], encoding='utf-8-sig')
pop_df = pop_df[['TOWN', 'VILLAGE', 'M_CNT', 'F_CNT', 'P_CNT']].copy()
# Build lookup: (district_name, village_name) → row
pop_lookup = {}
for _, row in pop_df.iterrows():
    pop_lookup[(str(row['TOWN']), str(row['VILLAGE']))] = row
print(f"  {len(pop_lookup)} village records loaded.")

# ── Load income Excel ───────────────────────────────────────────────────────
print(f"\nLoading income data from {INCOME_XLSX} ...")
inc_df = pd.read_excel(INCOME_XLSX, header=0)
inc_df['district'] = inc_df['縣市別'].str.replace('臺南市', '', regex=False)
# Build lookup: (district_name, village_name) → row
inc_lookup = {}
for _, row in inc_df.iterrows():
    inc_lookup[(str(row['district']), str(row['村里']))] = row
print(f"  {len(inc_lookup)} income records loaded.")

# ── Patch each node ─────────────────────────────────────────────────────────
matched_pop = 0
matched_inc = 0

for node in nodes:
    # node['name'] = e.g. "新營區忠政里"
    # We need to split it into (district, village).
    # Since district names are 2 or 3 chars ending in 區, use a simple split strategy.
    name = node['name']
    district = None
    village  = None

    # Find the 區 boundary
    idx = name.find('區')
    if idx != -1:
        district = name[:idx + 1]  # e.g. "新營區"
        village  = name[idx + 1:]  # e.g. "忠政里"

    # ── Gender ratio ──────────────────────────────────────────────────────
    pop_row = pop_lookup.get((district, village)) if district else None
    if pop_row is not None:
        m = int(pop_row['M_CNT'])
        f = int(pop_row['F_CNT'])
        total = int(pop_row['P_CNT'])
        node['male_ratio'] = round(m / total, 4) if total > 0 else 0.5
        matched_pop += 1
    else:
        node.setdefault('male_ratio', 0.5)

    # ── Income distribution ───────────────────────────────────────────────
    inc_row = inc_lookup.get((district, village)) if district else None
    if inc_row is not None:
        node['income_mean']   = int(inc_row['平均數'])
        node['income_median'] = int(inc_row['中位數'])
        node['income_q1']     = int(inc_row['第一分位數'])
        node['income_q3']     = int(inc_row['第三分位數'])
        matched_inc += 1
    else:
        node.setdefault('income_mean',   FALLBACK_MEAN)
        node.setdefault('income_median', FALLBACK_MEDIAN)
        node.setdefault('income_q1',     FALLBACK_Q1)
        node.setdefault('income_q3',     FALLBACK_Q3)

print(f"\n  Gender ratio matched:  {matched_pop} / {len(nodes)}")
print(f"  Income data matched:   {matched_inc} / {len(nodes)}")

# ── Write patched network.json ──────────────────────────────────────────────
with open(NETWORK_JSON, 'w', encoding='utf-8') as f:
    json.dump(network, f, ensure_ascii=False)

print(f"\n[DONE] {NETWORK_JSON} updated with gender & income data.")
print(f"       (Original backed up at {backup})")

