import React, { useMemo } from 'react';
import '../styles/AdminCharts.css';

const AdminCharts = ({ adminData }) => {
  const chartData = adminData?.chartData;
  
  if (!chartData) {
    return null;
  }

  // Prepare data for line charts
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

  // Simple bar chart component
  const BarChart = ({ data, label, color }) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data, 1);
    const scale = 100 / maxValue;

    return (
      <div className="chart-container">
        <h3>{label}</h3>
        <div className="chart-bars">
          {data.map((value, index) => (
            <div key={index} className="bar-item">
              <div className="bar-value">{value}</div>
              <div className="bar" style={{
                height: `${value * scale}px`,
                backgroundColor: color
              }}></div>
              <div className="bar-label">{index % 3 === 0 ? data.labels?.[index] || index : ''}</div>
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
                <div className="stacked-bar-value">{total}</div>
                <div className="stacked-bar">
                  {completedPercent > 0 && (
                    <div 
                      className="stacked-segment completed" 
                      style={{ width: `${completedPercent}%` }}
                      title={`Completed: ${data.completed[index] || 0}`}
                    ></div>
                  )}
                  {pendingPercent > 0 && (
                    <div 
                      className="stacked-segment pending" 
                      style={{ width: `${pendingPercent}%` }}
                      title={`Pending: ${data.pending[index] || 0}`}
                    ></div>
                  )}
                  {failedPercent > 0 && (
                    <div 
                      className="stacked-segment failed" 
                      style={{ width: `${failedPercent}%` }}
                      title={`Failed: ${data.failed[index] || 0}`}
                    ></div>
                  )}
                  {inProgressPercent > 0 && (
                    <div 
                      className="stacked-segment in_progress" 
                      style={{ width: `${inProgressPercent}%` }}
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
            label="Users Created by Date" 
            color="#1CBBB4"
          />
        )}
        
        {templatesChartData && (
          <BarChart 
            data={templatesChartData.data} 
            label="Templates Created by Date" 
            color="#2196F3"
          />
        )}
        
        {testsChartData && (
          <BarChart 
            data={testsChartData.data} 
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
    </div>
  );
};

export default AdminCharts;
