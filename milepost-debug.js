// milepost-debug.js
// Debug utility to test milepost parsing and sorting

export function debugMilepostSorting() {
  console.log('🔍 Debug: Analyzing milepost sorting...');
  
  if (!window.camerasList || !window.curatedRoutes) {
    console.log('⚠️ Camera list or routes not loaded yet');
    return;
  }

  // Test with I-84 route specifically
  const i84Route = window.curatedRoutes.find(r => r.displayName === 'I-84 (Weber Canyon)');
  if (!i84Route) {
    console.log('⚠️ I-84 route not found');
    return;
  }

  console.log(`🧪 Testing I-84 route: ${i84Route.name}, MP range: ${i84Route.mpMin}-${i84Route.mpMax}`);

  // Find cameras that match I-84
  const normalizeRoute = (routeName) => {
    if (!routeName) return null;
    let normalized = routeName.replace(/^0+/, ''); // Remove leading zeros
    normalized = normalized.replace(/[PN]$/, 'P'); // Standardize to P suffix
    return normalized;
  };

  const targetRoute = normalizeRoute(i84Route.name);
  console.log(`Target route normalized: "${targetRoute}"`);

  const matchingCameras = window.camerasList.filter(cam => {
    const route1 = normalizeRoute(cam.RoadwayOption1);
    const route2 = normalizeRoute(cam.RoadwayOption2);
    
    const routeMatches = (route1 === targetRoute || route2 === targetRoute);
    if (!routeMatches) return false;
    
    // Check milepost range
    let mp = null;
    if (route1 === targetRoute) mp = cam.MilepostOption1;
    if (route2 === targetRoute) mp = cam.MilepostOption2;
    
    if (mp == null) return false;
    if (i84Route.mpMin != null && mp < i84Route.mpMin) return false;
    if (i84Route.mpMax != null && mp > i84Route.mpMax) return false;
    
    return true;
  });

  console.log(`Found ${matchingCameras.length} matching cameras for I-84`);

  if (matchingCameras.length > 0) {
    console.log('\n📋 Camera details before sorting:');
    matchingCameras.forEach((cam, idx) => {
      const route1 = normalizeRoute(cam.RoadwayOption1);
      const route2 = normalizeRoute(cam.RoadwayOption2);
      let activeMp = null;
      let activeRoute = null;
      
      if (route1 === targetRoute) {
        activeMp = cam.MilepostOption1;
        activeRoute = cam.RoadwayOption1;
      } else if (route2 === targetRoute) {
        activeMp = cam.MilepostOption2;
        activeRoute = cam.RoadwayOption2;
      }
      
      console.log(`${idx + 1}. ID: ${cam.Id}, MP: ${activeMp} (from ${activeRoute}), Location: ${cam.Location.substring(0, 60)}...`);
    });

    // Sort by milepost
    const sorted = [...matchingCameras].sort((a, b) => {
      const getMp = (cam) => {
        const route1 = normalizeRoute(cam.RoadwayOption1);
        const route2 = normalizeRoute(cam.RoadwayOption2);
        
        if (route1 === targetRoute) return cam.MilepostOption1;
        if (route2 === targetRoute) return cam.MilepostOption2;
        return 0;
      };
      
      const mpA = getMp(a);
      const mpB = getMp(b);
      return mpA - mpB; // Ascending order
    });

    console.log('\n📋 Camera details after sorting by milepost:');
    sorted.forEach((cam, idx) => {
      const route1 = normalizeRoute(cam.RoadwayOption1);
      const route2 = normalizeRoute(cam.RoadwayOption2);
      let activeMp = null;
      let activeRoute = null;
      
      if (route1 === targetRoute) {
        activeMp = cam.MilepostOption1;
        activeRoute = cam.RoadwayOption1;
      } else if (route2 === targetRoute) {
        activeMp = cam.MilepostOption2;
        activeRoute = cam.RoadwayOption2;
      }
      
      console.log(`${idx + 1}. ID: ${cam.Id}, MP: ${activeMp} (from ${activeRoute}), Location: ${cam.Location.substring(0, 60)}...`);
    });
  }

  // Also test a sample of raw data to see milepost values
  console.log('\n📊 Sample of raw milepost data from first 10 cameras:');
  window.camerasList.slice(0, 10).forEach(cam => {
    console.log(`ID: ${cam.Id}, Route1: ${cam.RoadwayOption1} (MP: ${cam.MilepostOption1}), Route2: ${cam.RoadwayOption2} (MP: ${cam.MilepostOption2})`);
  });
}

// Make it available globally for easy console access
window.debugMilepostSorting = debugMilepostSorting;
