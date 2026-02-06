// Script to reset DeepProfile extension configuration
// This script helps fix issues with incorrect API URLs like localhost:1815

async function resetConfig() {
  console.log("Resetting DeepProfile configuration...");
  
  // Check if Chrome APIs are available
  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      // Get the current config
      const result = await chrome.storage.local.get('deep_profile_config');
      const currentConfig = result['deep_profile_config'];
      
      if (currentConfig) {
        console.log("Current config found:", currentConfig);
        
        // Reset customBaseUrls to empty
        if (currentConfig.customBaseUrls) {
          for (const provider in currentConfig.customBaseUrls) {
            if (currentConfig.customBaseUrls[provider].includes('1815')) {
              console.log(`Found localhost:1815 in ${provider} config, resetting...`);
              currentConfig.customBaseUrls[provider] = '';
            }
          }
        }
        
        // Save the updated config
        await chrome.storage.local.set({ 'deep_profile_config': currentConfig });
        console.log("Configuration reset successfully!");
      } else {
        console.log("No existing config found.");
      }
    } catch (error) {
      console.error("Error accessing Chrome storage:", error);
    }
  } else {
    console.log("Chrome APIs not available (likely in test environment)");
  }
}

// Execute the reset
resetConfig();

export { resetConfig };