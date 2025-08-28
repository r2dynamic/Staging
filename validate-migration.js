// validate-migration.js
// Utility to test and validate the camera data migration

export async function validateMigration() {
  console.log('🔍 Starting migration validation...');
  
  try {
    // Load both formats for comparison
    const [geoJsonResponse, legacyResponse] = await Promise.all([
      fetch('cameras.geojson'),
      fetch('cameras.json')
    ]);
    
    const geoJsonData = await geoJsonResponse.json();
    const legacyData = await legacyResponse.json();
    
    console.log(`📊 Data Summary:
    - GeoJSON features: ${geoJsonData.features?.length || 0}
    - Legacy cameras: ${legacyData.CamerasList?.length || 0}`);
    
    // Test transformation
    const transformedCameras = geoJsonData.features.map(feature => {
      const props = feature.properties;
      return {
        id: props.ID,
        name: props.name,
        imageUrl: props.ImageUrl,
        latitude: props.latitude,
        longitude: props.longitude,
        region: props.UDOT_Region,
        city: props.City,
        county: props.County
      };
    });
    
    // Validation checks
    const validationResults = {
      totalCameras: transformedCameras.length,
      camerasWithImages: transformedCameras.filter(c => c.imageUrl && c.imageUrl.startsWith('http')).length,
      camerasWithCoords: transformedCameras.filter(c => c.latitude && c.longitude).length,
      uniqueRegions: [...new Set(transformedCameras.map(c => c.region))].length,
      uniqueCounties: [...new Set(transformedCameras.map(c => c.county))].length,
      uniqueCities: [...new Set(transformedCameras.map(c => c.city))].length
    };
    
    console.log('✅ Validation Results:', validationResults);
    
    // Sample camera data
    console.log('📷 Sample Camera:', transformedCameras[0]);
    
    return validationResults;
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return null;
  }
}

// Auto-run validation if in development mode
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  validateMigration();
}
