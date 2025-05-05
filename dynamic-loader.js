// dynamic-loader.js
function loadOptionalFeature(featureName) {
    try {
      const mod = require(featureName);
      console.log(`✅ Loaded ${featureName} successfully`);
      return mod;
    } catch (err) {
      console.log(`⚠️ Feature ${featureName} not available`);
      return null;
    }
  }
  
  // Dynamically load left-pad
  const pad = loadOptionalFeature('left-pad');
  if (pad) {
    console.log('Example left-pad output:', pad('foo', 8, '_'));
  }
  
  module.exports = { loadOptionalFeature };
  