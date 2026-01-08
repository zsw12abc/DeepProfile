/**
 * 清除浏览器中存储的旧主题配置
 * 此脚本将帮助移除旧的主题（default, dark, compact），只保留新的四个主题
 */

async function clearOldThemes() {
  console.log('正在检查扩展配置...');
  
  try {
    // 获取当前配置
    const result = await chrome.storage.local.get("deep_profile_config");
    const config = result["deep_profile_config"];
    
    if (!config) {
      console.log('未找到配置，使用默认配置');
      return;
    }
    
    console.log('发现现有配置，正在处理...');
    
    // 检查是否有旧主题
    const oldThemeIds = ['default', 'dark', 'compact'];
    const hasOldThemes = oldThemeIds.some(id => config.themes && config.themes[id]);
    
    if (hasOldThemes) {
      console.log('检测到旧主题，正在移除...');
      
      // 创建新配置，只保留新主题
      const newThemes = {};
      const newThemeIds = ['zhihu-white', 'zhihu-black', 'reddit-white', 'reddit-black'];
      
      newThemeIds.forEach(id => {
        if (config.themes && config.themes[id]) {
          newThemes[id] = config.themes[id];
        }
      });
      
      // 确保新主题定义存在
      if (!newThemes['zhihu-white']) {
        newThemes['zhihu-white'] = {
          id: 'zhihu-white',
          name: 'Zhihu White Theme',
          description: 'Zhihu-inspired light theme with blue accents',
          colors: {
            primary: '#0084ff',
            secondary: '#3498db',
            background: '#f9fafb',
            surface: '#ffffff',
            text: '#333333',
            textSecondary: '#666666',
            border: '#e0e0e0',
            success: '#27ae60',
            warning: '#f39c12',
            error: '#e74c3c',
            accent: '#0084ff'
          },
          typography: {
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSizeBase: '14px',
            fontSizeSmall: '12px',
            fontSizeMedium: '16px',
            fontSizeLarge: '18px',
            fontWeightNormal: 400,
            fontWeightBold: 600,
            lineHeight: 1.5
          },
          spacing: {
            xs: '4px',
            sm: '8px',
            md: '16px',
            lg: '24px',
            xl: '32px',
            xxl: '48px'
          },
          borderRadius: {
            small: '4px',
            medium: '8px',
            large: '12px'
          },
          shadows: {
            small: '0 2px 4px rgba(0,0,0,0.05)',
            medium: '0 4px 12px rgba(0,0,0,0.1)',
            large: '0 8px 24px rgba(0,0,0,0.15)'
          }
        };
      }
      
      if (!newThemes['zhihu-black']) {
        newThemes['zhihu-black'] = {
          id: 'zhihu-black',
          name: 'Zhihu Dark Theme',
          description: 'Zhihu-inspired dark theme with blue accents',
          colors: {
            primary: '#0084ff',
            secondary: '#3498db',
            background: '#121212',
            surface: '#1e1e1e',
            text: '#e0e0e0',
            textSecondary: '#aaaaaa',
            border: '#444444',
            success: '#27ae60',
            warning: '#f39c12',
            error: '#e74c3c',
            accent: '#0084ff'
          },
          typography: {
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSizeBase: '14px',
            fontSizeSmall: '12px',
            fontSizeMedium: '16px',
            fontSizeLarge: '18px',
            fontWeightNormal: 400,
            fontWeightBold: 600,
            lineHeight: 1.5
          },
          spacing: {
            xs: '4px',
            sm: '8px',
            md: '16px',
            lg: '24px',
            xl: '32px',
            xxl: '48px'
          },
          borderRadius: {
            small: '4px',
            medium: '8px',
            large: '12px'
          },
          shadows: {
            small: '0 2px 4px rgba(0,0,0,0.3)',
            medium: '0 4px 12px rgba(0,0,0,0.4)',
            large: '0 8px 24px rgba(0,0,0,0.5)'
          }
        };
      }
      
      if (!newThemes['reddit-white']) {
        newThemes['reddit-white'] = {
          id: 'reddit-white',
          name: 'Reddit White Theme',
          description: 'Reddit-inspired light theme with orangered and periwinkle accents',
          colors: {
            primary: '#FF4500',
            secondary: '#9494FF',
            background: '#dae0e6',
            surface: '#ffffff',
            text: '#1c1c1c',
            textSecondary: '#666666',
            border: '#ccc',
            success: '#27ae60',
            warning: '#f39c12',
            error: '#e74c3c',
            accent: '#FF4500'
          },
          typography: {
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSizeBase: '14px',
            fontSizeSmall: '12px',
            fontSizeMedium: '16px',
            fontSizeLarge: '18px',
            fontWeightNormal: 400,
            fontWeightBold: 600,
            lineHeight: 1.5
          },
          spacing: {
            xs: '4px',
            sm: '8px',
            md: '16px',
            lg: '24px',
            xl: '32px',
            xxl: '48px'
          },
          borderRadius: {
            small: '4px',
            medium: '8px',
            large: '12px'
          },
          shadows: {
            small: '0 2px 4px rgba(0,0,0,0.05)',
            medium: '0 4px 12px rgba(0,0,0,0.1)',
            large: '0 8px 24px rgba(0,0,0,0.15)'
          }
        };
      }
      
      if (!newThemes['reddit-black']) {
        newThemes['reddit-black'] = {
          id: 'reddit-black',
          name: 'Reddit Dark Theme',
          description: 'Reddit-inspired dark theme with orangered and periwinkle accents',
          colors: {
            primary: '#FF4500',
            secondary: '#9494FF',
            background: '#1a1a1b',
            surface: '#272729',
            text: '#d7dadc',
            textSecondary: '#a8aab4',
            border: '#474a4e',
            success: '#27ae60',
            warning: '#f39c12',
            error: '#e74c3c',
            accent: '#FF4500'
          },
          typography: {
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSizeBase: '14px',
            fontSizeSmall: '12px',
            fontSizeMedium: '16px',
            fontSizeLarge: '18px',
            fontWeightNormal: 400,
            fontWeightBold: 600,
            lineHeight: 1.5
          },
          spacing: {
            xs: '4px',
            sm: '8px',
            md: '16px',
            lg: '24px',
            xl: '32px',
            xxl: '48px'
          },
          borderRadius: {
            small: '4px',
            medium: '8px',
            large: '12px'
          },
          shadows: {
            small: '0 2px 4px rgba(0,0,0,0.3)',
            medium: '0 4px 12px rgba(0,0,0,0.4)',
            large: '0 8px 24px rgba(0,0,0,0.5)'
          }
        };
      }
      
      // 更新配置，只保留新主题
      const updatedConfig = {
        ...config,
        themes: newThemes,
        // 如果之前使用的是旧主题，切换到新默认主题
        themeId: oldThemeIds.includes(config.themeId) ? 'zhihu-white' : config.themeId
      };
      
      // 保存更新后的配置
      await chrome.storage.local.set({ "deep_profile_config": updatedConfig });
      console.log('旧主题已成功移除，配置已更新');
    } else {
      console.log('未检测到旧主题，配置已是最新');
    }
    
    console.log('主题清理完成');
  } catch (error) {
    console.error('处理配置时出现错误:', error);
  }
}

// 导出函数以便在扩展中使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clearOldThemes };
}

// 如果直接运行此脚本
if (typeof chrome !== 'undefined' && chrome.storage) {
  clearOldThemes();
}