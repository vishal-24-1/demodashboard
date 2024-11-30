import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from statsmodels.tsa.arima.model import ARIMA
import json
from datetime import datetime

# Load the data
df = pd.read_csv('brand_sales_data.csv')

# Convert date to datetime
df['Transaction Date/Time'] = pd.to_datetime(df['Transaction Date/Time'])

# Basic analysis
total_sales = df['Total Sales Amount'].sum()
average_order_value = df['Total Sales Amount'].mean()
top_selling_product = df.groupby('Product SKU')['Quantity Sold'].sum().idxmax()
best_performing_outlet = df.groupby('Outlet ID/Location')['Total Sales Amount'].sum().idxmax()

# Sales trends over time
sales_trends = df.groupby(df['Transaction Date/Time'].dt.to_period('D'))['Total Sales Amount'].sum().reset_index()
sales_trends['Transaction Date/Time'] = sales_trends['Transaction Date/Time'].dt.to_timestamp()

# Product popularity & sales volume
product_sales = df.groupby('Product SKU').agg({
    'Quantity Sold': 'sum',
    'Total Sales Amount': 'sum'
}).reset_index().sort_values('Quantity Sold', ascending=False)

# Revenue growth analysis
revenue_growth = df.groupby(['Transaction Date/Time', 'Product SKU', 'Outlet ID/Location'])['Total Sales Amount'].sum().reset_index()

# Distributor/Outlet performance
outlet_performance = df.groupby('Outlet ID/Location').agg({
    'Total Sales Amount': 'sum',
    'Quantity Sold': 'sum'
}).reset_index()

# Inventory turnover rate
df['Inventory Data'] = df['Inventory Data'].str.extract('(\d+)').astype(float)
inventory_turnover = df.groupby('Product SKU').apply(lambda x: x['Quantity Sold'].sum() / x['Inventory Data'].mean()).reset_index(name='Turnover Rate')

# Demand forecasting (simple ARIMA model)
def forecast_demand(data, periods=30):
    model = ARIMA(data, order=(1,1,1))
    results = model.fit()
    forecast = results.forecast(steps=periods)
    return forecast

demand_forecast = df.groupby('Transaction Date/Time')['Quantity Sold'].sum().resample('D').sum()
forecast = forecast_demand(demand_forecast)

# SWOT analysis (simplified)
def swot_analysis(outlet):
    strengths = []
    weaknesses = []
    opportunities = []
    threats = []
    
    avg_sales = outlet_performance['Total Sales Amount'].mean()
    if outlet['Total Sales Amount'] > avg_sales:
        strengths.append("Above average sales")
    else:
        weaknesses.append("Below average sales")
    
    if outlet['Quantity Sold'] > outlet_performance['Quantity Sold'].mean():
        strengths.append("High sales volume")
    else:
        opportunities.append("Potential to increase sales volume")
    
    return {
        'Strengths': strengths,
        'Weaknesses': weaknesses,
        'Opportunities': opportunities,
        'Threats': threats
    }

outlet_swot = outlet_performance.apply(swot_analysis, axis=1)

# Sales driver identification
sales_drivers = df.groupby(['Transaction Date/Time', 'Product SKU', 'Outlet ID/Location']).agg({
    'Total Sales Amount': 'sum',
    'Quantity Sold': 'sum'
}).reset_index()

# Perform clustering to identify sales drivers
scaler = StandardScaler()
X = scaler.fit_transform(sales_drivers[['Total Sales Amount', 'Quantity Sold']])
kmeans = KMeans(n_clusters=3, random_state=42)
sales_drivers['Cluster'] = kmeans.fit_predict(X)

# Custom JSON encoder to handle datetime objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, pd.Timestamp)):
            return obj.isoformat()
        return super(DateTimeEncoder, self).default(obj)

# Prepare results
results = {
    'kpis': {
        'total_sales': float(total_sales),
        'average_order_value': float(average_order_value),
        'top_selling_product': top_selling_product,
        'best_performing_outlet': best_performing_outlet
    },
    'sales_trends': sales_trends.to_dict(orient='records'),
    'product_sales': product_sales.to_dict(orient='records'),
    'revenue_growth': revenue_growth.to_dict(orient='records'),
    'outlet_performance': outlet_performance.to_dict(orient='records'),
    'inventory_turnover': inventory_turnover.to_dict(orient='records'),
    'demand_forecast': {k.isoformat(): float(v) for k, v in forecast.items()},
    'outlet_swot': outlet_swot.to_dict(),
    'sales_drivers': sales_drivers.to_dict(orient='records')
}

# Export results to JSON
with open('analysis_results.json', 'w') as f:
    json.dump(results, f, cls=DateTimeEncoder)

print("Analysis complete. Results saved to analysis_results.json")
