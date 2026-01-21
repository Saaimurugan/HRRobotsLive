import React, { useMemo } from 'react';
import '../styles/AdminCharts.css';

const AdminCharts = ({ adminData }) => {
  const chartData = adminData?.chartData;
  
  if (!chartData) {
    return null;
  }

  // Prepare data for date-wise charts
  const usersChartData = useMemo(() => {
    if (!chartData.usersDateWise) return null;
    const dates = Object.keys(chartData.usersDateWise).sort();
    return {
      labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      data: dates.map(d => chartData.usersDateWise[d])
    };
  }, [chartData.usersDateWise]);

  const templatesChartData = useMemo(() => {
    if (!chartData.templatesDateWise) return null;
    const dates = Object.keys(chartData.templatesDateWise).sort();
    return {
      labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      data: dates.map(d => chartData.templatesDateWise[d])
    };
  }, [chartData.templatesDateWise]);

  const testsChartData = useMemo(() => {
    if (!chartData.testsDateWise) return null;
    const dates = Object.keys(chartData.testsDateWise).sort();
    return {
      labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      data: dates.map(d => chartData.testsDateWise[d])
    };
  }, [chartData.testsDateWise]);

  const testsStatusChartData = useMemo(() => {
    if (!chartData.testsStatusDateWise) return null;
    const dates = Object.keys(chartData.testsStatusDateWise).sort();
    return {
      labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      completed: dates.map(d => chartData.testsStatusDateWise[d].completed || 0),
      pending: dates.map(d => chartData.testsStatusDateWise[d].pending || 0),
      failed: dates.map(d => chartData.testsStatusDateWise[d].failed || 0),
      in_progress: dates.map(d => chartData.testsStatusDateWise[d].in_progress || 0)
    };
  }, [chartData.testsStatusDateWise]);

  // Prepare time period data
  const timePeriodData = useMemo(() => {
    if (!chartData.timePeriods) return null;
    return chartData.timePeriods;
  }, [chartData.timePeriods]);

  // Prepare comparison data
  const comparisonData = useMemo(() => {
    if (!chartData.comparisons) return null;
    return chartData.comparisons;
  }, [chartData.comparisons]);

  // Prepare grouped data
  const groupedData = useMemo(() => {
    if (!chartData.groupedData) return null;
    return chartData.groupedData;
  }, [chartData.groupedData]);

  // Simple bar chart component
  const BarChart = ({ data, labels, label, color }) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data, 1);
    const scale = 150 / maxValue;

    return (
      <div className="chart-container">
        <h3>{label}</h3>
        <div className="chart-bars">
          {data.map((value, index) => (
            <div key={index} className="bar-item">
              {value > 0 && <div className="bar-value">{value}</div>}
              <div className="bar" style={{
                height: `${Math.max(value * scale, 2)}px`,
                backgroundColor: color
              }}></div>
              <div className="bar-label">{index % 3 === 0 ? labels?.[index] || '' : ''}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Comparison bar chart (side by side)
  const ComparisonBarChart = ({ data, label, colors }) => {
    if (!data || Object.keys(data).length === 0) return null;
    
    const values = Object.values(data);
    const maxValue = Math.max(...values, 1);
    const scale = 150 / maxValue;

    return (
      <div className="chart-container">
        <h3>{label}</h3>
        <div className="comparison-bars">
          {Object.entries(data).map(([key, value], index) => (
            <div key={index} className="comparison-bar-item">
              <div className="comparison-bar-value">{value}</div>
              <div className="comparison-bar" style={{
                height: `${Math.max(value * scale, 2)}px`,
                backgroundColor: colors[index % colors.length]
              }}></div>
              <div className="comparison-bar-label">{key}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Time period chart (3 bars for today, this week, this month)
  const TimePeriodChart = ({ data, label, color }) => {
    if (!data) return null;
    
    const values = [data.today || 0, data.thisWeek || 0, data.thisMonth || 0];
    const maxValue = Math.max(...values, 1);
    const scale = 150 / maxValue;

    return (
      <div className="chart-container">
        <h3>{label}</h3>
        <div className="time-period-bars">
          {[
            { label: 'Today', value: data.today || 0 },
            { label: 'This Week', value: data.thisWeek || 0 },
            { label: 'This Month', value: data.thisMonth || 0 }
          ].map((item, index) => (
            <div key={index} className="time-period-bar-item">
              <div className="time-period-bar-value">{item.value}</div>
              <div className="time-period-bar" style={{
                height: `${Math.max(item.value * scale, 2)}px`,
                backgroundColor: color
              }}></div>
              <div className="time-period-bar-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Grouped data chart (top 10 items)
  const GroupedDataChart = ({ data, label, color }) => {
    if (!data || Object.keys(data).length === 0) return null;
    
    // Sort and get top 10
    const sorted = Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const maxValue = Math.max(...sorted.map(item => item[1]), 1);
    const scale = 150 / maxValue;

    return (
      <div className="chart-container">
        <h3>{label}</h3>
        <div className="grouped-data-chart">
          {sorted.map((item, index) => (
            <div key={index} className="grouped-data-item">
              <div className="grouped-data-label" title={item[0]}>
                {item[0].length > 20 ? item[0].substring(0, 17) + '...' : item[0]}
              </div>
              <div className="grouped-data-bar-container">
                <div className="grouped-data-bar" style={{
                  width: `${Math.max(item[1] * scale, 2)}px`,
                  backgroundColor: color
                }}></div>
              </div>
              <div className="grouped-data-value">{item[1]}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Stacked bar chart for status
  const StackedBarChart = ({ data, label }) => {
    if (!data || data.labels.length === 0) return null;

    return (
      <div className="chart-container">
        <h3>{label}</h3>
        <div className="stacked-chart-bars">
          {data.labels.map((dateLabel, index) => {
            const total = (data.completed[index] || 0) + (data.pending[index] || 0) + (data.failed[index] || 0) + (data.in_progress[index] || 0);
            const completedPercent = total > 0 ? ((data.completed[index] || 0) / total) * 100 : 0;
            const pendingPercent = total > 0 ? ((data.pending[index] || 0) / total) * 100 : 0;
            const failedPercent = total > 0 ? ((data.failed[index] || 0) / total) * 100 : 0;
            const inProgressPercent = total > 0 ? ((data.in_progress[index] || 0) / total) * 100 : 0;

            return (
              <div key={index} className="stacked-bar-item">
                {total > 0 && <div className="stacked-bar-value">{total}</div>}
                <div className="stacked-bar">
                  {completedPercent > 0 && (
                    <div 
                      className="stacked-segment completed" 
                      style={{ height: `${completedPercent}%` }}
                      title={`Completed: ${data.completed[index] || 0}`}
                    ></div>
                  )}
                  {pendingPercent > 0 && (
                    <div 
                      className="stacked-segment pending" 
                      style={{ height: `${pendingPercent}%` }}
                      title={`Pending: ${data.pending[index] || 0}`}
                    ></div>
                  )}
                  {failedPercent > 0 && (
                    <div 
                      className="stacked-segment failed" 
                      style={{ height: `${failedPercent}%` }}
                      title={`Failed: ${data.failed[index] || 0}`}
                    ></div>
                  )}
                  {inProgressPercent > 0 && (
                    <div 
                      className="stacked-segment in_progress" 
                      style={{ height: `${inProgressPercent}%` }}
                      title={`In Progress: ${data.in_progress[index] || 0}`}
                    ></div>
                  )}
                </div>
                <div className="stacked-bar-label">{index % 3 === 0 ? dateLabel : ''}</div>
              </div>
            );
          })}
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color completed"></div>
            <span>Completed</span>
          </div>
          <div className="legend-item">
            <div className="legend-color pending"></div>
            <span>Pending</span>
          </div>
          <div className="legend-item">
            <div className="legend-color failed"></div>
            <span>Failed</span>
          </div>
          <div className="legend-item">
            <div className="legend-color in_progress"></div>
            <span>In Progress</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-charts-section">
      <h2>Analytics - Last 30 Days</h2>
      
      <div className="charts-grid">
        {usersChartData && (
          <BarChart 
            data={usersChartData.data}
            labels={usersChartData.labels}
            label="Users Created by Date" 
            color="#1CBBB4"
          />
        )}
        
        {templatesChartData && (
          <BarChart 
            data={templatesChartData.data}
            labels={templatesChartData.labels}
            label="Templates Created by Date" 
            color="#2196F3"
          />
        )}
        
        {testsChartData && (
          <BarChart 
            data={testsChartData.data}
            labels={testsChartData.labels}
            label="Tests Created by Date" 
            color="#FF9800"
          />
        )}
        
        {testsStatusChartData && (
          <StackedBarChart 
            data={testsStatusChartData}
            label="Tests by Status by Date"
          />
        )}
      </div>

      <h2 style={{ marginTop: '30px' }}>Time Period Analysis</h2>
      
      <div className="charts-grid">
        {timePeriodData?.users && (
          <TimePeriodChart 
            data={timePeriodData.users}
            label="Users Created" 
            color="#1CBBB4"
          />
        )}
        
        {timePeriodData?.templates && (
          <TimePeriodChart 
            data={timePeriodData.templates}
            label="Templates Created" 
            color="#2196F3"
          />
        )}
        
        {timePeriodData?.tests && (
          <TimePeriodChart 
            data={timePeriodData.tests}
            label="Tests Created" 
            color="#FF9800"
          />
        )}
      </div>

      <h2 style={{ marginTop: '30px' }}>Comparisons</h2>
      
      <div className="charts-grid">
        {comparisonData?.usersVsTemplates && (
          <ComparisonBarChart 
            data={comparisonData.usersVsTemplates}
            label="Users vs Templates" 
            colors={['#1CBBB4', '#2196F3']}
          />
        )}
        
        {comparisonData?.usersVsTests && (
          <ComparisonBarChart 
            data={comparisonData.usersVsTests}
            label="Users vs Test Transactions" 
            colors={['#1CBBB4', '#FF9800']}
          />
        )}
        
        {comparisonData?.templatesVsTests && (
          <ComparisonBarChart 
            data={comparisonData.templatesVsTests}
            label="Templates vs Test Transactions" 
            colors={['#2196F3', '#FF9800']}
          />
        )}
        
        {comparisonData?.statusCounts && (
          <ComparisonBarChart 
            data={comparisonData.statusCounts}
            label="Test Transactions by Status" 
            colors={['#4CAF50', '#FF9800', '#f44336', '#2196F3']}
          />
        )}
        
        {comparisonData?.templateStatusCounts && (
          <ComparisonBarChart 
            data={comparisonData.templateStatusCounts}
            label="Templates by Status" 
            colors={['#4CAF50', '#FF9800', '#2196F3']}
          />
        )}
      </div>

      <h2 style={{ marginTop: '30px' }}>Grouped Data Analysis</h2>
      
      <div className="charts-grid">
        {groupedData?.templatesByUser && (
          <GroupedDataChart 
            data={groupedData.templatesByUser}
            label="Templates Grouped by User" 
            color="#2196F3"
          />
        )}
        
        {groupedData?.testsByUser && (
          <GroupedDataChart 
            data={groupedData.testsByUser}
            label="Test Transactions Grouped by User" 
            color="#FF9800"
          />
        )}
        
        {groupedData?.testsByTemplate && (
          <GroupedDataChart 
            data={groupedData.testsByTemplate}
            label="Test Transactions Grouped by Template" 
            color="#1CBBB4"
          />
        )}
        
        {groupedData?.templatesByStatus && (
          <ComparisonBarChart 
            data={groupedData.templatesByStatus}
            label="Templates Grouped by Status" 
            colors={['#4CAF50', '#FF9800', '#2196F3']}
          />
        )}
      </div>
    </div>
  );
};

export default AdminCharts;
