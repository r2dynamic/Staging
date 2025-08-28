// route-debug.js
// Debug utility to analyze route matching issues

export function debugRouteMatching() {
  console.log('🔍 Debug: Analyzing route matching...');
  
  if (!window.camerasList || !window.curatedRoutes) {
    console.log('⚠️ Camera list or routes not loaded yet');
    return;
  }

  console.log(`📊 Total cameras: ${window.camerasList.length}`);
  console.log(`📊 Total routes: ${window.curatedRoutes.length}`);

  // Analyze route patterns in camera data
  const routePatterns = new Map();
  window.camerasList.forEach(cam => {
    if (cam.RoadwayOption1) {
      routePatterns.set(cam.RoadwayOption1, (routePatterns.get(cam.RoadwayOption1) || 0) + 1);
    }
    if (cam.RoadwayOption2) {
      routePatterns.set(cam.RoadwayOption2, (routePatterns.get(cam.RoadwayOption2) || 0) + 1);
    }
  });

  console.log('📈 Top 20 route patterns in camera data:');
  [...routePatterns.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([route, count]) => {
      console.log(`  ${route}: ${count} cameras`);
    });

  console.log('\n📋 Routes defined in routes.json:');
  window.curatedRoutes.forEach(route => {
    const routeName = route.name || 'Multi-segment';
    const displayName = route.displayName || route.name;
    console.log(`  ${routeName} (${displayName})`);
    
    if (route.routes) {
      route.routes.forEach(subRoute => {
        console.log(`    ↳ ${subRoute.name} (MP ${subRoute.mpMin}-${subRoute.mpMax})`);
      });
    }
  });

  // Test a specific route match with detailed milepost analysis
  console.log('\n🧪 Testing route matching for I-84 (Weber Canyon):');
  const testRoute = window.curatedRoutes.find(r => r.displayName === 'I-84 (Weber Canyon)');
  if (testRoute) {
    console.log(`Target route: ${testRoute.name}, MP range: ${testRoute.mpMin}-${testRoute.mpMax}`);
    
    const matchingCameras = window.camerasList.filter(cam => {
      const normalizeRoute = (routeName) => {
        if (!routeName) return null;
        let normalized = routeName.replace(/^0+/, '');
        normalized = normalized.replace(/[PN]$/, 'P');
        return normalized;
      };
      
      const targetRoute = normalizeRoute(testRoute.name);
      const route1 = normalizeRoute(cam.RoadwayOption1);
      const route2 = normalizeRoute(cam.RoadwayOption2);
      
      // Check route match first
      const routeMatches = (route1 === targetRoute || route2 === targetRoute);
      if (!routeMatches) return false;
      
      // Then check milepost range if specified
      if (testRoute.mpMin != null || testRoute.mpMax != null) {
        let mp = null;
        if (route1 === targetRoute) mp = cam.MilepostOption1;
        if (route2 === targetRoute) mp = cam.MilepostOption2;
        
        if (mp == null) return false;
        if (testRoute.mpMin != null && mp < testRoute.mpMin) return false;
        if (testRoute.mpMax != null && mp > testRoute.mpMax) return false;
      }
      
      return true;
    });
    
    console.log(`Found ${matchingCameras.length} cameras for ${testRoute.displayName}`);
    if (matchingCameras.length > 0) {
      // Sort by milepost for display
      const sorted = matchingCameras.sort((a, b) => {
        const getMp = (cam) => {
          const normalizeRoute = (routeName) => {
            if (!routeName) return null;
            let normalized = routeName.replace(/^0+/, '');
            normalized = normalized.replace(/[PN]$/, 'P');
            return normalized;
          };
          
          const targetRoute = normalizeRoute(testRoute.name);
          const route1 = normalizeRoute(cam.RoadwayOption1);
          const route2 = normalizeRoute(cam.RoadwayOption2);
          
          if (route1 === targetRoute) return cam.MilepostOption1;
          if (route2 === targetRoute) return cam.MilepostOption2;
          return 0;
        };
        
        return getMp(a) - getMp(b);
      });
      
      console.log('Sample matches (sorted by milepost):', sorted.slice(0, 5).map(cam => {
        const normalizeRoute = (routeName) => {
          if (!routeName) return null;
          let normalized = routeName.replace(/^0+/, '');
          normalized = normalized.replace(/[PN]$/, 'P');
          return normalized;
        };
        
        const targetRoute = normalizeRoute(testRoute.name);
        const route1 = normalizeRoute(cam.RoadwayOption1);
        const route2 = normalizeRoute(cam.RoadwayOption2);
        
        let activeMp = null;
        if (route1 === targetRoute) activeMp = cam.MilepostOption1;
        if (route2 === targetRoute) activeMp = cam.MilepostOption2;
        
        return {
          id: cam.Id,
          location: cam.Location.substring(0, 50) + '...',
          route1: cam.RoadwayOption1,
          route2: cam.RoadwayOption2,
          mp1: cam.MilepostOption1,
          mp2: cam.MilepostOption2,
          activeMp: activeMp
        };
      }));
    }
  }

  // Test I-70 route as well
  console.log('\n🧪 Testing route matching for I-70:');
  const i70Route = window.curatedRoutes.find(r => r.displayName === 'I-70');
  if (i70Route) {
    console.log(`Target route: ${i70Route.name}, MP range: ${i70Route.mpMin || 'none'}-${i70Route.mpMax || 'none'}`);
    
    // Look for cameras with 70P routes
    const i70Cameras = window.camerasList.filter(cam => {
      return cam.RoadwayOption1?.includes('70') || cam.RoadwayOption2?.includes('70');
    });
    
    console.log(`Found ${i70Cameras.length} cameras with route containing '70':`);
    i70Cameras.slice(0, 5).forEach(cam => {
      console.log(`  ${cam.Id}: ${cam.Location.substring(0, 40)}... Route1: ${cam.RoadwayOption1}, Route2: ${cam.RoadwayOption2}, MP1: ${cam.MilepostOption1}, MP2: ${cam.MilepostOption2}`);
    });
  }
}

// Make it available globally for easy console access
window.debugRouteMatching = debugRouteMatching;
