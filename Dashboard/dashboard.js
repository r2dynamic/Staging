// dashboard/dashboard.js
// Populates the Camera Issues Dashboard with CSV data

/**
 * Configuration for dashboard metrics - easy to update as CSV structure changes
 */
const DASHBOARD_CONFIG = {
  // Metrics to display as cards on Data Issues page (from cctv_quality_report_summary)
  cardMetrics: [
    { category: 'Duplicates', name: 'Duplicate_Location', label: 'Duplicate Location', icon: 'copy', color: 'orange' },
    { category: 'Duplicates', name: 'Duplicate_Coordinates', label: 'Duplicate Coords', icon: 'map-pin', color: 'orange' },
    { category: 'Geometric', name: 'Offset_Over_1000ft', label: 'Offset >1000ft', icon: 'map-marked', color: 'red' },
    { category: 'Geometric', name: 'MP_Difference_Over_Half_Mile', label: 'MP Diff >0.5mi', icon: 'road', color: 'red' },
    { category: 'Naming', name: 'Missing_At_Separator', label: 'Missing @ Symbol', icon: 'at', color: 'yellow' },
    { category: 'Naming', name: 'Missing_Comma', label: 'Missing Comma', icon: 'edit', color: 'yellow' },
    { category: 'Naming', name: 'Missing_Hyphen_In_Route', label: 'Missing Hyphen', icon: 'minus', color: 'yellow' },
    { category: 'Naming', name: 'Unknown_Abbreviation', label: 'Unknown Abbrev', icon: 'question-circle', color: 'yellow' },
    { category: 'Naming', name: 'City_County_Mismatch', label: 'City/County Mismatch', icon: 'exclamation-triangle', color: 'red' }
  ],
  
  // Card to display on Stats/Counts page
  statsCardMetric: { category: 'General', name: 'Total_Cameras', label: 'Total Cameras', icon: 'camera', color: 'green' },
  
  // Categories to display as charts
  chartCategories: [
    { category: 'Regional', label: 'Region', type: 'pie' },
    { category: 'Geographic_County', label: 'County', type: 'pie' },
    { category: 'Geographic_City', label: 'City', type: 'pie', limit: 10 }
  ]
};

/**
 * Color mappings for different metric types
 */
const METRIC_COLORS = {
  green: { bg: 'linear-gradient(135deg, #3e8e41, #2a6b2f)', hover: 'rgba(62, 142, 65, 0.2)' },
  red: { bg: 'linear-gradient(135deg, #e74c3c, #c0392b)', hover: 'rgba(231, 76, 60, 0.2)' },
  orange: { bg: 'linear-gradient(135deg, #f39c12, #e67e22)', hover: 'rgba(243, 156, 18, 0.2)' },
  yellow: { bg: 'linear-gradient(135deg, #f1c40f, #f39c12)', hover: 'rgba(241, 196, 15, 0.2)' },
  gray: { bg: 'linear-gradient(135deg, #95a5a6, #7f8c8d)', hover: 'rgba(149, 165, 166, 0.2)' }
};

// Store loaded data globally
let summaryData = [];
let detailsData = [];
let geojsonData = null;
let chartInstances = {};

/**
 * Parse CSV text into array of objects
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  });
}

/**
 * Load CSV files
 */
async function loadCSVData() {
  try {
    const [summaryResponse, detailsResponse] = await Promise.all([
      fetch('Dashboard/cctv_quality_report_summary.csv'),
      fetch('Dashboard/cctv_quality_report_details.csv')
    ]);
    
    summaryData = parseCSV(await summaryResponse.text());
    detailsData = parseCSV(await detailsResponse.text());
    
    return true;
  } catch (error) {
    console.error('Error loading dashboard CSV data:', error);
    return false;
  }
}

/**
 * Load GeoJSON file
 */
async function loadGeoJSONData() {
  try {
    const response = await fetch('cctv_locations_processed_classified.geojson');
    geojsonData = await response.json();
    return true;
  } catch (error) {
    console.error('Error loading GeoJSON data:', error);
    return false;
  }
}

/**
 * Get metric value from summary data
 */
function getMetricValue(category, metricName) {
  const row = summaryData.find(r => 
    r.Metric_Category === category && r.Metric_Name === metricName
  );
  
  // Debug logging
  if (!row) {
    console.log(`Could not find metric: ${category} / ${metricName}`);
    console.log('Available data sample:', summaryData.slice(0, 5));
  }
  
  return row ? parseInt(row.Count || 0) : 0;
}

/**
 * Get all metrics for a category
 */
function getCategoryMetrics(category) {
  return summaryData
    .filter(r => r.Metric_Category === category)
    .filter(r => !r.Metric_Name.includes('_NULL')) // Exclude NULL entries
    .map(r => {
      let displayName = r.Metric_Name;
      
      // Clean up display names
      if (displayName.startsWith('UDOT_Region_')) {
        displayName = displayName.replace('UDOT_Region_', '');
      } else if (displayName.startsWith('County_')) {
        displayName = displayName.replace('County_', '');
      } else if (displayName.startsWith('City_')) {
        displayName = displayName.replace('City_', '');
      }
      
      return {
        name: displayName,
        count: parseInt(r.Count || 0)
      };
    })
    .filter(m => m.count > 0)
    .sort((a, b) => b.count - a.count);
}

/**
 * Update metric cards
 */
function updateMetricCards() {
  const container = document.getElementById('dashboardMetricsContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Debug logging to see what categories/names are available
  console.log('=== DASHBOARD DEBUG ===');
  console.log('Total rows in summaryData:', summaryData.length);
  console.log('All available categories:', [...new Set(summaryData.map(r => r.Metric_Category))]);
  console.log('Sample rows:', summaryData.slice(0, 10));
  
  DASHBOARD_CONFIG.cardMetrics.forEach(metric => {
    console.log(`Looking for: Category="${metric.category}", Name="${metric.name}"`);
    const value = getMetricValue(metric.category, metric.name);
    console.log(`Found value: ${value}`);
    const colors = METRIC_COLORS[metric.color] || METRIC_COLORS.gray;
    
    const card = document.createElement('div');
    card.className = 'col-lg-3 col-md-4 col-sm-6';
    
    // Special handling for Total Cameras card with status breakdown
    if (metric.name === 'Total_Cameras') {
      const enabledCount = getMetricValue('Status', 'Status_Enabled');
      const disabledCount = getMetricValue('Status', 'Status_Disabled');
      
      card.innerHTML = `
        <div class="dashboard-card">
          <div class="liquidGlass-effect"></div>
          <div class="liquidGlass-tint"></div>
          <div class="liquidGlass-shine"></div>
          <div class="liquidGlass-content">
            <div class="dashboard-card-icon" style="background: ${colors.bg};">
              <i class="fas fa-${metric.icon}"></i>
            </div>
            <div class="dashboard-card-content">
              <h6 class="dashboard-card-label">${metric.label}</h6>
              <h2 class="dashboard-card-value">${value}</h2>
              <div style="margin-top: 10px; font-size: 0.85rem; color: rgba(255,255,255,0.8);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span><i class="fas fa-check-circle" style="color: #3e8e41; margin-right: 5px;"></i>Enabled:</span>
                  <strong>${enabledCount}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span><i class="fas fa-times-circle" style="color: #e74c3c; margin-right: 5px;"></i>Disabled:</span>
                  <strong>${disabledCount}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="dashboard-card">
          <div class="liquidGlass-effect"></div>
          <div class="liquidGlass-tint"></div>
          <div class="liquidGlass-shine"></div>
          <div class="liquidGlass-content">
            <div class="dashboard-card-icon" style="background: ${colors.bg};">
              <i class="fas fa-${metric.icon}"></i>
            </div>
            <div class="dashboard-card-content">
              <h6 class="dashboard-card-label">${metric.label}</h6>
              <h2 class="dashboard-card-value">${value}</h2>
            </div>
          </div>
        </div>
      `;
    }
    
    container.appendChild(card);
  });
}

/**
 * Create or update a chart
 */
function createChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Destroy existing chart if it exists
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }
  
  // Get data either from config.data (custom) or from category metrics
  const metrics = config.data || getCategoryMetrics(config.category);
  
  // Apply limit if specified
  const limitedMetrics = config.limit ? metrics.slice(0, config.limit) : metrics;
  
  const chartData = {
    labels: limitedMetrics.map(m => m.name),
    datasets: [{
      label: config.label,
      data: limitedMetrics.map(m => m.count),
      backgroundColor: config.type === 'pie' ? 
        generateColors(limitedMetrics.length) :
        'rgba(62, 142, 65, 1)',
      borderColor: config.type === 'pie' ?
        'rgba(255, 255, 255, 1)' :
        'rgba(62, 142, 65, 1)',
      borderWidth: 2
    }]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: config.type === 'pie',
        position: 'right',
        labels: { 
          color: 'white', 
          font: { size: 12 },
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                return {
                  text: `${label}: ${value}`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor,
                  lineWidth: data.datasets[0].borderWidth,
                  hidden: false,
                  index: i,
                  fontColor: 'white'
                };
              });
            }
            return [];
          }
        }
      },
      title: {
        display: true,
        text: config.label,
        color: 'white',
        font: { size: 16, weight: 'bold' }
      }
    },
    scales: config.type === 'bar' ? {
      y: {
        beginAtZero: true,
        ticks: { color: 'white' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      x: {
        ticks: { color: 'white' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    } : {}
  };
  
  chartInstances[canvasId] = new Chart(ctx, {
    type: config.type,
    data: chartData,
    options: chartOptions
  });
}

/**
 * Generate colors for pie charts
 */
function generateColors(count) {
  const baseColors = [
    'rgba(62, 142, 65, 1)',   // green
    'rgba(52, 152, 219, 1)',  // blue
    'rgba(243, 156, 18, 1)',  // orange
    'rgba(231, 76, 60, 1)',   // red
    'rgba(155, 89, 182, 1)',  // purple
    'rgba(241, 196, 15, 1)',  // yellow
    'rgba(26, 188, 156, 1)',  // turquoise
    'rgba(230, 126, 34, 1)',  // dark orange
    'rgba(149, 165, 166, 1)', // gray
    'rgba(192, 57, 43, 1)'    // dark red
  ];
  
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  return colors;
}

/**
 * Update all charts
 */
/**
 * Update Stats/Counts page with Total Cameras card and charts
 */
async function updateStatsPage() {
  // Ensure CSV data is loaded
  if (summaryData.length === 0) {
    await loadCSVData();
  }
  
  // Add Total Cameras card at the top
  const statsCardsContainer = document.getElementById('dashboardStatsCardsContainer');
  if (statsCardsContainer) {
    const metric = DASHBOARD_CONFIG.statsCardMetric;
    const value = getMetricValue(metric.category, metric.name);
    const colors = METRIC_COLORS[metric.color] || METRIC_COLORS.gray;
    
    // Debug: Show all metrics in the Status category
    const statusMetrics = summaryData.filter(r => r.Metric_Category === 'Status');
    console.log('All Status category metrics:', statusMetrics);
    
    // Get enabled/disabled counts - search for any metric containing "enable" or "disable"
    let enabledCount = 0;
    let disabledCount = 0;
    
    // Search through all Status metrics for enabled/disabled
    statusMetrics.forEach(metric => {
      const name = metric.Metric_Name.toLowerCase();
      console.log(`Checking metric: ${metric.Metric_Name} = ${metric.Count}`);
      if (name.includes('enable') && !name.includes('disable')) {
        enabledCount = parseInt(metric.Count || 0);
        console.log(`Found enabled count: ${enabledCount}`);
      } else if (name.includes('disable')) {
        disabledCount = parseInt(metric.Count || 0);
        console.log(`Found disabled count: ${disabledCount}`);
      }
    });
    
    const card = document.createElement('div');
    card.className = 'col-12';
    card.innerHTML = `
      <div class="dashboard-card">
        <div class="liquidGlass-effect"></div>
        <div class="liquidGlass-tint"></div>
        <div class="liquidGlass-shine"></div>
        <div class="liquidGlass-content">
          <div class="dashboard-card-icon" style="background: ${colors.bg};">
            <i class="fas fa-${metric.icon}"></i>
          </div>
          <div class="dashboard-card-content">
            <h6 class="dashboard-card-label">${metric.label}</h6>
            <h2 class="dashboard-card-value">${value}</h2>
            <div style="margin-top: 10px; font-size: 0.85rem; color: rgba(255,255,255,0.8);">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span><i class="fas fa-check-circle" style="color: #3e8e41; margin-right: 5px;"></i>Enabled:</span>
                <strong>${enabledCount}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span><i class="fas fa-times-circle" style="color: #e74c3c; margin-right: 5px;"></i>Disabled:</span>
                <strong>${disabledCount}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    statsCardsContainer.innerHTML = '';
    statsCardsContainer.appendChild(card);
  }
  
  // Update charts
  DASHBOARD_CONFIG.chartCategories.forEach((config, index) => {
    createChart(`dashChart${index}`, config);
  });
}

/**
 * Get image issue counts from GeoJSON
 */
function getIssuesCounts() {
  if (!geojsonData) return {};
  
  const counts = {
    disabled: 0,
    offline: 0,
    upside_down: 0,
    grayscale: 0,
    old_timestamp: 0,
    poe_error: 0,
    poor_road: 0,
    total: geojsonData.features.length
  };
  
  geojsonData.features.forEach(feature => {
    const classification = feature.properties.classification;
    if (classification && counts.hasOwnProperty(classification)) {
      counts[classification]++;
    }
  });
  
  return counts;
}

/**
 * Get regional breakdown for image issues
 */
function getIssuesByRegion() {
  if (!geojsonData) return {};
  
  // Only count these 7 specific classification types
  const validClassifications = ['disabled', 'offline', 'upside_down', 'grayscale', 'old_timestamp', 'poe_error', 'poor_road'];
  
  const regions = {};
  
  geojsonData.features.forEach(feature => {
    const classification = feature.properties.classification;
    const region = feature.properties.UDOT_Region || 'Unknown';
    
    // Only count if it's one of the 7 valid classifications
    if (classification && validClassifications.includes(classification)) {
      if (!regions[region]) {
        regions[region] = 0;
      }
      regions[region]++;
    }
  });
  
  return regions;
}

/**
 * Get issue type breakdown
 */
function getIssuesByType() {
  const counts = getIssuesCounts();
  const issueTypes = [];
  
  const issueLabels = {
    disabled: 'Disabled',
    offline: 'Offline',
    upside_down: 'Upside Down',
    grayscale: 'Grayscale',
    old_timestamp: 'Old Timestamp',
    poe_error: 'POE Error',
    poor_road: 'Poor Road View'
  };
  
  Object.keys(issueLabels).forEach(key => {
    if (counts[key] > 0) {
      issueTypes.push({
        name: issueLabels[key],
        count: counts[key]
      });
    }
  });
  
  return issueTypes.sort((a, b) => b.count - a.count);
}

/**
 * Update image issues cards
 */
function updateIssuesCards() {
  const container = document.getElementById('dashboardIssuesContainer');
  if (!container) return;
  
  container.innerHTML = '';
  const counts = getIssuesCounts();
  
  const issueConfigs = [
    { key: 'disabled', label: 'Disabled Cameras', icon: 'ban', color: 'gray' },
    { key: 'offline', label: 'Offline', icon: 'plug', color: 'red' },
    { key: 'upside_down', label: 'Upside Down', icon: 'undo-alt', color: 'orange' },
    { key: 'grayscale', label: 'Grayscale', icon: 'adjust', color: 'yellow' },
    { key: 'old_timestamp', label: 'Old Timestamp', icon: 'clock', color: 'yellow' },
    { key: 'poe_error', label: 'POE Error', icon: 'exclamation-triangle', color: 'red' },
    { key: 'poor_road', label: 'Poor Road View', icon: 'eye-slash', color: 'orange' }
  ];
  
  issueConfigs.forEach(config => {
    const value = counts[config.key] || 0;
    const colors = METRIC_COLORS[config.color] || METRIC_COLORS.gray;
    
    const card = document.createElement('div');
    card.className = 'col-lg-3 col-md-4 col-sm-6';
    card.innerHTML = `
      <div class="dashboard-card">
        <div class="liquidGlass-effect"></div>
        <div class="liquidGlass-tint"></div>
        <div class="liquidGlass-shine"></div>
        <div class="liquidGlass-content">
          <div class="dashboard-card-icon" style="background: ${colors.bg};">
            <i class="fas fa-${config.icon}"></i>
          </div>
          <div class="dashboard-card-content">
            <h6 class="dashboard-card-label">${config.label}</h6>
            <h2 class="dashboard-card-value">${value}</h2>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * Update image issues charts
 */
function updateIssuesCharts() {
  // Chart 1: Issues by Type (Pie)
  const issuesByType = getIssuesByType();
  if (issuesByType.length > 0) {
    createChart('dashIssuesChart0', {
      category: 'custom',
      label: 'Issues by Type',
      type: 'pie',
      data: issuesByType
    });
  }
  
  // Chart 2: Issues by Region (Pie)
  const issuesByRegion = getIssuesByRegion();
  const regionData = Object.keys(issuesByRegion)
    .map(region => ({
      name: region.replace('Region ', ''),
      count: issuesByRegion[region]
    }))
    .sort((a, b) => b.count - a.count);
  
  if (regionData.length > 0) {
    createChart('dashIssuesChart1', {
      category: 'custom',
      label: 'Issues by Region',
      type: 'pie',
      data: regionData
    });
  }
}

/**
 * Main update function for Data Issues page
 */
export async function updateDashboardStats() {
  // Show loading state
  const container = document.getElementById('dashboardMetricsContainer');
  if (container) {
    container.innerHTML = '<div class="text-center text-white p-5"><i class="fas fa-spinner fa-spin fa-3x"></i><p class="mt-3">Loading dashboard data...</p></div>';
  }
  
  // Load CSV data
  const loaded = await loadCSVData();
  
  if (!loaded) {
    if (container) {
      container.innerHTML = '<div class="text-center text-white p-5"><i class="fas fa-exclamation-triangle fa-3x mb-3"></i><p>Error loading dashboard data</p></div>';
    }
    return;
  }
  
  // Update UI - only cards, not charts
  updateMetricCards();
}

/**
 * Main update function for Image Issues page
 */
async function updateIssuesPage() {
  const container = document.getElementById('dashboardIssuesContainer');
  if (container) {
    container.innerHTML = '<div class="text-center text-white p-5"><i class="fas fa-spinner fa-spin fa-3x"></i><p class="mt-3">Loading camera issues data...</p></div>';
  }
  
  // Load GeoJSON data if not already loaded
  if (!geojsonData) {
    const loaded = await loadGeoJSONData();
    if (!loaded) {
      if (container) {
        container.innerHTML = '<div class="text-center text-white p-5"><i class="fas fa-exclamation-triangle fa-3x mb-3"></i><p>Error loading camera issues data</p></div>';
      }
      return;
    }
  }
  
  // Update UI
  updateIssuesCards();
  updateIssuesCharts();
}

/**
 * Switch between dashboard pages
 */
async function switchDashboardPage(pageName) {
  const qualityPage = document.getElementById('dashPageQuality');
  const issuesPage = document.getElementById('dashPageIssues');
  const statsPage = document.getElementById('dashPageStats');
  const qualityBtn = document.getElementById('dashNavQuality');
  const issuesBtn = document.getElementById('dashNavIssues');
  const statsBtn = document.getElementById('dashNavStats');
  
  // Hide all pages and deactivate all buttons
  qualityPage.style.display = 'none';
  issuesPage.style.display = 'none';
  statsPage.style.display = 'none';
  qualityBtn.classList.remove('active');
  issuesBtn.classList.remove('active');
  statsBtn.classList.remove('active');
  
  if (pageName === 'quality') {
    qualityPage.style.display = 'block';
    qualityBtn.classList.add('active');
    await updateDashboardStats();
  } else if (pageName === 'issues') {
    issuesPage.style.display = 'block';
    issuesBtn.classList.add('active');
    await updateIssuesPage();
  } else if (pageName === 'stats') {
    statsPage.style.display = 'block';
    statsBtn.classList.add('active');
    await updateStatsPage();
  }
}

/**
 * Initialize dashboard listeners
 */
export function initDashboard() {
  const dashboardModal = document.getElementById('cameraIssuesDashboard');
  
  if (dashboardModal) {
    dashboardModal.addEventListener('shown.bs.modal', async () => {
      await updateIssuesPage();
    });
  }
  
  // Navigation button listeners
  const qualityBtn = document.getElementById('dashNavQuality');
  const issuesBtn = document.getElementById('dashNavIssues');
  const statsBtn = document.getElementById('dashNavStats');
  
  if (qualityBtn) {
    qualityBtn.addEventListener('click', () => switchDashboardPage('quality'));
  }
  
  if (issuesBtn) {
    issuesBtn.addEventListener('click', () => switchDashboardPage('issues'));
  }
  
  if (statsBtn) {
    statsBtn.addEventListener('click', () => switchDashboardPage('stats'));
  }
}
