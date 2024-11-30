import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import data from './data.json'; // Import your JSON file
import './Dashboard.css'; // Import the CSS file for styling

const Dashboard = () => {
  // State variables
  const [startDate, setStartDate] = useState(''); // Start date in 'YYYY-MM-DD' format
  const [endDate, setEndDate] = useState(''); // End date in 'YYYY-MM-DD' format
  const [filteredData, setFilteredData] = useState([]);
  const [aiInsights, setAIInsights] = useState([]);

  // Function to parse date strings in 'DD-MM-YYYY' format
  const parseDate = (dateString) => {
    const [day, month, year] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Function to filter data based on selected date range
  const filterDataByDateRange = (data, startDate, endDate) => {
    const start = startDate ? new Date(startDate) : new Date(0); // If no start date, use earliest date
    const end = endDate ? new Date(endDate) : new Date(); // If no end date, use current date

    return data.filter((item) => {
      const itemDate = parseDate(item.Date);
      return itemDate >= start && itemDate <= end;
    });
  };

  // Function to calculate Sales Through Rate
  const calculateSalesThroughRate = (data) => {
    const grouped = data.reduce((acc, item) => {
      const productId = item['Product ID'];
      if (!acc[productId]) {
        acc[productId] = {
          'Total Quantity Bought Initially': 0,
          'Total Quantity Sold': 0,
        };
      }
      acc[productId]['Total Quantity Bought Initially'] += item['Total Quantity Bought Initially'];
      acc[productId]['Total Quantity Sold'] += item['Quantity Sold'];
      return acc;
    }, {});

    const salesThroughRateData = Object.entries(grouped)
      .map(([productId, values]) => {
        const { 'Total Quantity Sold': totalSold, 'Total Quantity Bought Initially': totalBought } = values;
        const salesThroughRate = totalBought !== 0 ? totalSold / totalBought : 0;
        return {
          'Product ID': productId,
          'Sales Through Rate': salesThroughRate,
        };
      })
      .sort((a, b) => b['Sales Through Rate'] - a['Sales Through Rate'])
      .slice(0, 10); // Top 10

    return salesThroughRateData;
  };

  // Function to group and summarize data
  const groupAndSummarizeData = (data, groupKey, valueKey = null) => {
    const grouped = data.reduce((acc, item) => {
      const key = item[groupKey];
      if (!acc[key]) acc[key] = 0; // Initialize
      acc[key] += valueKey ? item[valueKey] : 1; // Sum valueKey or count
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([key, value]) => ({ [groupKey]: key, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10
  };

  const calculateSalesTrendData = (data) => {
    const salesTrend = {};
  
    data.forEach((item) => {
      const date = parseDate(item.Date).toISOString().split('T')[0]; // Format date as 'YYYY-MM-DD'
  
      if (!salesTrend[date]) {
        salesTrend[date] = {
          date,
          totalSales: 0,
          totalQuantitySold: 0,
        };
      }
  
      salesTrend[date].totalSales += item['Final Price'] * item['Quantity Sold'];
      salesTrend[date].totalQuantitySold += item['Quantity Sold'];
    });
  
    // Convert the object to an array and sort by date
    const salesTrendData = Object.values(salesTrend).sort((a, b) => new Date(a.date) - new Date(b.date));
  
    return salesTrendData;
  };

  // Function to calculate profit data
  const calculateProfitData = (data) => {
    const profitData = {};

    data.forEach((item) => {
      const styleID = item['Style ID'];
      const size = item.Size;
      const profit = (item['Final Price'] - item['Cost Price']) * item['Quantity Sold'];

      if (!profitData[styleID]) profitData[styleID] = {};
      if (!profitData[styleID][size]) profitData[styleID][size] = 0;

      profitData[styleID][size] += profit; // Sum profit by Style ID and Size
    });

    const totalProfits = Object.keys(profitData)
      .map((styleID) => {
        const sizes = profitData[styleID];
        const totalProfit = Object.values(sizes).reduce((sum, val) => sum + val, 0);
        return { styleID, sizes, totalProfit };
      })
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 10); // Top 10

    // Transform data for chart
    return totalProfits.map(({ styleID, sizes }) => {
      const result = { styleID };
      for (const [size, profit] of Object.entries(sizes)) {
        result[size] = profit;
      }
      return result;
    });
  };

  // Function to generate AI insights
  // Function to generate AI insights
const generateAIInsights = (data) => {
  const insights = [];

  if (data.length === 0) {
    insights.push('No data available for the selected date range.');
    return insights;
  }

  // Top-selling products
  const topProducts = groupAndSummarizeData(data, 'Product ID', 'Quantity Sold').slice(0, 3);
  insights.push(`Top-selling products: ${topProducts.map((p) => p['Product ID']).join(', ')}.`);

  // Highest profit margins
  const profitMargins = data.map((item) => {
    const profitMargin = ((item['Final Price'] - item['Cost Price']) / item['Final Price']) * 100;
    return { ...item, profitMargin };
  });
  const highProfitProducts = groupAndSummarizeData(profitMargins, 'Product ID', 'profitMargin').slice(0, 3);
  insights.push(`Products with highest profit margins: ${highProfitProducts.map((p) => p['Product ID']).join(', ')}.`);

  // Low stock products
  const lowStockProducts = data.filter(
    (item) => item['Total Quantity Bought Initially'] - item['Quantity Sold'] < 10
  );
  const uniqueLowStockProducts = [...new Set(lowStockProducts.map((item) => item['Product ID']))];
  if (uniqueLowStockProducts.length > 0) {
    insights.push(`Products with low stock: ${uniqueLowStockProducts.join(', ')}. Consider restocking.`);
  }

  // Trends in sales by size
  const sizeSales = groupAndSummarizeData(data, 'Size', 'Quantity Sold');
  const topSizes = sizeSales.slice(0, 3);
  insights.push(`Top selling sizes: ${topSizes.map((s) => s.Size).join(', ')}.`);

  // **New Insight: Highest Sold Product Details**
  // Identify the highest sold product
  if (topProducts.length > 0) {
    const highestSoldProduct = topProducts[0];
    const productId = highestSoldProduct['Product ID'];

    // Ensure consistent data types
    const productIdStr = String(productId);

    // Filter data for the highest sold product
    const productData = data.filter((item) => String(item['Product ID']) === productIdStr);

    if (productData.length > 0) {
      // Find the size contributing the most to sales
      const sizeContribution = groupAndSummarizeData(productData, 'Size', 'Quantity Sold');

      if (sizeContribution.length > 0) {
        const topSize = sizeContribution[0];
        const size = topSize['Size'];

        // Filter data for the top size
        const sizeData = productData.filter((item) => item['Size'] === size);

        if (sizeData.length > 0) {
          // Find the color contributing the most to sales
          const colorContribution = groupAndSummarizeData(sizeData, 'Color', 'Quantity Sold');

          if (colorContribution.length > 0) {
            const topColor = colorContribution[0];
            const color = topColor['Color'];

            insights.push(
              `The highest sold product is ${productId}, with size ${size} contributing the most to its sales. Within this size, the color ${color} has the highest sales.`
            );
          } else {
            insights.push(
              `The highest sold product is ${productId}, with size ${size} contributing the most to its sales.`
            );
          }
        } else {
          insights.push(`The highest sold product is ${productId}.`);
        }
      } else {
        insights.push(`The highest sold product is ${productId}.`);
      }
    } else {
      insights.push(`The highest sold product is ${productId}.`);
    }
  }


  // **Additional Insight: Sales Trend Over Time**
  // Analyze sales trend over the selected date range
  const salesByDate = data.reduce((acc, item) => {
    const date = parseDate(item.Date).toISOString().split('T')[0]; // Format date as 'YYYY-MM-DD'
    if (!acc[date]) acc[date] = 0;
    acc[date] += item['Quantity Sold'];
    return acc;
  }, {});

  const dates = Object.keys(salesByDate).sort();
  if (dates.length > 1) {
    const firstDateSales = salesByDate[dates[0]];
    const lastDateSales = salesByDate[dates[dates.length - 1]];
    const trend = lastDateSales >= firstDateSales ? 'increased' : 'decreased';
    insights.push(
      `Sales have ${trend} over the selected period, from ${firstDateSales} units on ${dates[0]} to ${lastDateSales} units on ${dates[dates.length - 1]}.`
    );
  }

  return insights;
};

  // useEffect to update data when date range changes
  useEffect(() => {
    const filtered = filterDataByDateRange(data, startDate, endDate);
    setFilteredData(filtered);

    // Generate AI Insights
    const insights = generateAIInsights(filtered);
    setAIInsights(insights);
  }, [startDate, endDate]);

  // Calculate metrics for the cards
  const distinctProductCount = new Set(filteredData.map((item) => item['Product ID'])).size;
  const totalFinalPrice = filteredData.reduce(
    (sum, item) => sum + item['Final Price'] * item['Quantity Sold'],
    0
  );
  const totalProfit = filteredData.reduce(
    (sum, item) => sum + (item['Final Price'] - item['Cost Price']) * item['Quantity Sold'],
    0
  );
  const avgProfit = filteredData.length > 0 ? totalProfit / filteredData.length : 0;

  // Data for charts
  const salesRateData = calculateSalesThroughRate(filteredData);
  const salesCountData = groupAndSummarizeData(filteredData, 'Product ID', 'Quantity Sold');
  const profitChartData = calculateProfitData(filteredData);
  const salesTrendData = calculateSalesTrendData(filteredData);
  const uniqueSizes = [...new Set(data.map((item) => item.Size))];

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="dashboard-container p-8 space-y-8 bg-gray-100 min-h-screen">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <img src="./Bluetyga.png" alt="Logo" className="h-auto" style={{ width: '13%' }} />
        <h1 className="text-4xl font-bold text-center">Sales Insights Dashboard</h1>
        <img src="./undefined.png" alt="Logo" className="h-auto" style={{ width: '13%' }} />
      </div>

      {/* Date Range Selector */}
      <div className="glass-card p-6">
        <h2 className="section-title">Select Date Range</h2>
        <div className="date-range-selector">
          <label>
            From:{' '}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="date-input"
            />
          </label>
          <label>
            To:{' '}
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="date-input"
            />
          </label>
        </div>
      </div>

      {/* Cards Section */}
      <div className="flex gap-6">
        {[
          { title: 'Distinct Product Count', value: distinctProductCount },
          { title: 'Total Final Price', value: `₹${totalFinalPrice.toFixed(2)}` },
          { title: 'Average Profit', value: `₹${avgProfit.toFixed(2)}` },
        ].map((item, index) => (
          <div key={index} className="glass-card p-6 flex-1">
            <h3 className="kpi-title">{item.title}</h3>
            <div className="kpi-value">{item.value}</div>
          </div>
        ))}
      </div>

      {/* AI Insights */}
      <div className="glass-card p-6">
        <h2 className="section-title">AI Insights</h2>
        <ul className="space-y-4">
          {aiInsights.map((insight, index) => (
            <li key={index} className="ai-insight">
              {insight}
            </li>
          ))}
        </ul>
      </div>

      {/* Sales Through Rate */}
      <section className="glass-card p-6">
        <h2 className="section-title">Sales Through Rate</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={salesRateData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Product ID" />
            <YAxis
              label={{ value: 'Sales Through Rate', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            />
            <Tooltip formatter={(value) => `${(value * 100).toFixed(2)}%`} />
            <Legend />
            <Bar dataKey="Sales Through Rate" fill="#8884d8">
              {salesRateData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Sales Count by Product ID */}
      <section className="glass-card p-6">
        <h2 className="section-title">Sales Count by Product ID</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={salesCountData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Product ID" />
            <YAxis label={{ value: 'Quantity Sold', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="Quantity Sold" fill="#82ca9d">
              {salesCountData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Profit Analysis with Split by Size */}
      <section className="glass-card p-6">
        <h2 className="section-title">Profit Analysis: Top Styles with Size Split</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={profitChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="styleID" />
            <YAxis label={{ value: 'Profit', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            {uniqueSizes.map((size, index) => (
              <Bar
                key={size}
                dataKey={size}
                name={`Size: ${size}`}
                stackId="a"
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </section>
      {/* Sales Trend Graph */}
      <section className="glass-card p-6">
        <h2 className="section-title">Sales Trend Over Time</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={salesTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" label={{ value: 'Total Sales', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Total Quantity Sold', angle: 90, position: 'insideRight' }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="totalSales" name="Total Sales" stroke="#8884d8" />
            <Line yAxisId="right" type="monotone" dataKey="totalQuantitySold" name="Total Quantity Sold" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      </section>

    </div>
  );
};

export default Dashboard;
