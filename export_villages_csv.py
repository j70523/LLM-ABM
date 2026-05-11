import json
import pandas as pd
import sys

# Set encoding for console output
sys.stdout.reconfigure(encoding='utf-8')

def export_to_csv():
    try:
        # Load the network data
        print("Reading public/network.json...")
        with open('public/network.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        nodes = data.get('nodes', [])
        if not nodes:
            print("No village data found in network.json")
            return

        # Convert to DataFrame
        df = pd.DataFrame(nodes)

        # Reorder or rename columns for better readability if needed
        # Current columns: id, name, cx, cy, population, attraction, male_ratio, income_mean, income_median, income_q1, income_q3
        
        # Calculate derived columns for CSV
        df['female_ratio'] = 1 - df['male_ratio']
        df['male_population'] = (df['population'] * df['male_ratio']).round(0).astype(int)
        df['female_population'] = df['population'] - df['male_population']

        # Reorder columns
        cols = [
            'id', 'name', 'population', 'male_population', 'female_population', 
            'male_ratio', 'female_ratio', 'income_mean', 'income_median', 
            'income_q1', 'income_q3', 'attraction', 'cx', 'cy'
        ]
        
        # Keep only existing columns from the list
        cols = [c for c in cols if c in df.columns]
        df = df[cols]

        # Export to CSV
        output_file = 'village_info_export.csv'
        df.to_csv(output_file, index=False, encoding='utf-8-sig')
        
        print(f"Successfully exported {len(df)} villages to {output_file}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    export_to_csv()
