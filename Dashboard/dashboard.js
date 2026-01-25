// dashboard/dashboard.js
// Populates the Camera Issues Dashboard with real-time data

/**
 * Updates the dashboard statistics when the dashboard modal is opened
 */
export function updateDashboardStats() {
  const cameras = window.camerasList || [];
  
  // Total cameras
  const totalCameras = cameras.length;
  document.getElementById('dashTotalCameras').textContent = totalCameras;
  
  // Count disabled cameras
  const disabledCameras = cameras.filter(cam => 
    Array.isArray(cam.Views) && 
    String(cam.Views[0]?.Status).toLowerCase() === 'disabled'
  ).length;
  document.getElementById('dashDisabledCameras').textContent = disabledCameras;
  
  // Active cameras (total - disabled)
  const activeCameras = totalCameras - disabledCameras;
  document.getElementById('dashActiveCameras').textContent = activeCameras;
  
  // Count specific issues
  const issueStats = {
    offline: 0,
    upsideDown: 0,
    grayscale: 0,
    oldTimestamp: 0,
    poeError: 0,
    poorRoad: 0
  };
  
  cameras.forEach(cam => {
    if (!Array.isArray(cam.Views) || !cam.Views[0]) return;
    
    const view = cam.Views[0];
    const issues = view.cameraIssues || [];
    
    issues.forEach(issue => {
      const issueLower = issue.toLowerCase();
      
      if (issueLower.includes('offline')) {
        issueStats.offline++;
      }
      if (issueLower.includes('upside') || issueLower.includes('inverted')) {
        issueStats.upsideDown++;
      }
      if (issueLower.includes('grayscale') || issueLower.includes('gray')) {
        issueStats.grayscale++;
      }
      if (issueLower.includes('timestamp') || issueLower.includes('old')) {
        issueStats.oldTimestamp++;
      }
      if (issueLower.includes('poe')) {
        issueStats.poeError++;
      }
      if (issueLower.includes('poor') || issueLower.includes('road')) {
        issueStats.poorRoad++;
      }
    });
  });
  
  // Update issue counts
  document.getElementById('dashOffline').textContent = issueStats.offline;
  document.getElementById('dashUpsideDown').textContent = issueStats.upsideDown;
  document.getElementById('dashGrayscale').textContent = issueStats.grayscale;
  document.getElementById('dashOldTimestamp').textContent = issueStats.oldTimestamp;
  document.getElementById('dashPoeError').textContent = issueStats.poeError;
  document.getElementById('dashPoorRoad').textContent = issueStats.poorRoad;
  
  // Total issues
  const totalIssues = Object.values(issueStats).reduce((sum, count) => sum + count, 0);
  document.getElementById('dashIssueCameras').textContent = totalIssues;
}

/**
 * Initialize dashboard listeners
 */
export function initDashboard() {
  const dashboardModal = document.getElementById('cameraIssuesDashboard');
  
  if (dashboardModal) {
    dashboardModal.addEventListener('shown.bs.modal', () => {
      updateDashboardStats();
    });
  }
}
