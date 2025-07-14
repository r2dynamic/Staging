// js/headerButtonToggle.js
// Toggle .active class for header control buttons and keep them active until toggled off or programmatically removed.


function setupHeaderButtonToggles() {
  const header = document.querySelector('.header-controls');
  if (!header) return;
  // Select the first 4 .square-button buttons (excluding dropdown toggles)
  const toggleButtons = [
    document.getElementById('cameraCount'),
    document.getElementById('filterDropdownButton'),
    document.getElementById('routeFilterButton'),
    document.getElementById('searchDropdownButton')
  ];
  toggleButtons.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', function () {
        btn.classList.toggle('active');
      });
    }
  });

  // Refresh button: only temporarily active
  const refreshBtn = document.getElementById('refreshButton');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      refreshBtn.classList.add('active');
      setTimeout(() => refreshBtn.classList.remove('active'), 400);
    });
  }
}

// Auto-run on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupHeaderButtonToggles);
} else {
  setupHeaderButtonToggles();
}

// Export for manual use if needed
export { setupHeaderButtonToggles };
