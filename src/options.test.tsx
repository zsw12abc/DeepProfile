import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Options from './options';
import { ConfigService } from '~services/ConfigService';
import { I18nService } from '~services/I18nService';
import { ThemeService } from '~services/ThemeService';
import { HistoryService } from '~services/HistoryService';
import { DEFAULT_CONFIG } from '~types';

// Mock chrome.storage.local
const storageMock = {
  get: vi.fn(),
  set: vi.fn(),
};

global.chrome = {
  storage: {
    local: storageMock,
  },
  runtime: {
    getManifest: vi.fn(() => ({ version: '1.0.0' })),
    openOptionsPage: vi.fn(),
  },
  action: {
    onClicked: {
      addListener: vi.fn(),
    },
  },
} as any;

// Mock services
vi.mock('~services/ConfigService', () => ({
  ConfigService: {
    getConfig: vi.fn(),
    saveConfig: vi.fn(),
  },
}));

vi.mock('~services/ThemeService', () => ({
  ThemeService: {
    getInstance: vi.fn(() => ({
      initialize: vi.fn(),
    })),
  },
}));

vi.mock('~services/HistoryService', () => ({
  HistoryService: {
    getAllUserRecords: vi.fn(),
  },
}));

vi.mock('~services/I18nService', () => ({
  I18nService: {
    init: vi.fn(),
    setLanguage: vi.fn(),
    t: vi.fn((key) => {
      const translations: Record<string, string> = {
        loading: 'Loading...',
        settings: 'Settings',
        settings_general: 'General Settings',
        settings_zhihu: 'Zhihu Settings',
        settings_reddit: 'Reddit Settings',
        settings_history: 'History',
        settings_debug: 'Developer Options',
        version_info: 'Version Information',
        saved: 'Saved!',
        app_description: 'AI-powered User Profile Analysis Tool',
        // Add other translations as needed
        'confirm_delete': 'Are you sure?',
        'confirm_clear_all': 'Are you sure you want to clear all records?',
        'unknown_user': 'Unknown User',
        'topic_classification': 'Topic Classification',
        'ai_summary': 'AI Summary',
        'value_orientation': 'Value Orientation',
        'export_markdown': 'Export as Markdown',
        'export_image': 'Export as Image',
        'delete': 'Delete',
        'changelog': 'Changelog',
        'version_history': 'Version History',
        'plugin_enabled': 'Plugin Enabled',
        'plugin_disabled': 'Plugin Disabled',
        'plugin_enabled_desc': 'Plugin will run on supported pages',
        'plugin_disabled_desc': 'Plugin will not run on any pages',
        'ai_provider': 'AI Provider',
        'api_key': 'API Key',
        'api_base_url': 'API Base URL',
        'model_select': 'Select Model',
        'test_connection': 'Test Connection',
        'connection_success': 'Connection Successful',
        'connection_failed': 'Connection Failed',
        'analyze_limit': 'Analyze Limit',
        'debug_mode': 'Debug Mode',
        'debug_mode_desc': 'Enable detailed logging',
      };
      return translations[key] || key;
    }),
  },
}));

vi.mock('~services/LabelService', () => ({
  LabelService: {
    getInstance: vi.fn(() => ({
      refreshCategories: vi.fn(),
    })),
  },
}));

vi.mock('~services/LabelDefinitions', () => ({
  invalidateLabelCache: vi.fn(),
}));

vi.mock('data-text:./locales/zh-CN/CHANGELOG.md', () => 'Chinese Changelog Content');
vi.mock('data-text:./locales/en-US/CHANGELOG.md', () => 'English Changelog Content');
vi.mock('data-base64:../assets/icon.png', () => 'icon-data');

// Mock components
vi.mock('~components/PlatformSettings', () => ({
  GeneralSettings: ({ config, setConfig }: { config: any; setConfig: any }) => (
    <div data-testid="general-settings">
      <input
        type="checkbox"
        data-testid="global-enabled"
        checked={config.globalEnabled}
        onChange={(e) => setConfig({ ...config, globalEnabled: e.target.checked })}
      />
      <select
        data-testid="language-select"
        value={config.language}
        onChange={(e) => setConfig({ ...config, language: e.target.value })}
      >
        <option value="zh-CN">中文</option>
        <option value="en-US">English</option>
      </select>
    </div>
  ),
  PlatformSpecificSettings: ({ config, setConfig, platform }: { config: any; setConfig: any; platform: string }) => (
    <div data-testid={`platform-settings-${platform}`}>
      <select
        data-testid={`analysis-mode-${platform}`}
        value={config.platformAnalysisModes?.[platform] || 'balanced'}
        onChange={(e) => setConfig({ 
          ...config, 
          platformAnalysisModes: { 
            ...config.platformAnalysisModes, 
            [platform]: e.target.value 
          } 
        })}
      >
        <option value="fast">Fast</option>
        <option value="balanced">Balanced</option>
        <option value="deep">Deep</option>
      </select>
    </div>
  ),
  DebugSettings: ({ config, setConfig }: { config: any; setConfig: any }) => (
    <div data-testid="debug-settings">
      <input
        type="checkbox"
        data-testid="debug-enabled"
        checked={config.enableDebug}
        onChange={(e) => setConfig({ ...config, enableDebug: e.target.checked })}
      />
    </div>
  ),
}));

vi.mock('~components/ModelSelector', () => ({
  ModelSelector: ({ config, setConfig }: { config: any; setConfig: any }) => (
    <div data-testid="model-selector">
      <input
        type="text"
        data-testid="model-name"
        value={config.customModelNames?.[config.selectedProvider] || ''}
        onChange={(e) => setConfig({
          ...config,
          customModelNames: {
            ...config.customModelNames,
            [config.selectedProvider]: e.target.value
          }
        })}
      />
    </div>
  ),
}));

vi.mock('~components/ThemeSettings', () => ({
  default: ({ config, setConfig }: { config: any; setConfig: any }) => (
    <div data-testid="theme-settings">
      <select
        data-testid="theme-select"
        value={config.themeId}
        onChange={(e) => setConfig({ ...config, themeId: e.target.value })}
      >
        <option value="zhihu-white">Zhihu White</option>
        <option value="zhihu-black">Zhihu Black</option>
      </select>
    </div>
  ),
}));

vi.mock('~components/HistorySection', () => ({
  HistorySection: () => <div data-testid="history-section">History Section</div>,
}));

vi.mock('~components/VersionInfo', () => ({
  VersionInfo: () => <div data-testid="version-info">Version Info</div>,
}));

vi.mock('~components/HelperComponents', () => ({
  ZhihuIcon: <span>Zhihu Icon</span>,
  RedditIcon: <span>Reddit Icon</span>,
  getBaseUrlPlaceholder: vi.fn(() => 'https://api.example.com'),
  shouldShowBaseUrlInput: vi.fn(() => false),
}));

describe('Options Component - Auto Save Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful config retrieval
    (ConfigService.getConfig as vi.Mock).mockResolvedValue(DEFAULT_CONFIG);
    (ConfigService.saveConfig as vi.Mock).mockResolvedValue(undefined);
    
    storageMock.get.mockResolvedValue({ deep_profile_config: DEFAULT_CONFIG });
    storageMock.set.mockResolvedValue(undefined);
    
    (HistoryService.getAllUserRecords as vi.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call saveConfig when handleConfigChange is invoked', async () => {
    render(<Options />);
    
    // Wait for initial config to load
    await waitFor(() => {
      expect(screen.getByTestId('general-settings')).toBeInTheDocument();
    });
    
    // Simulate a config change which should trigger auto-save
    const globalEnabledCheckbox = screen.getByTestId('global-enabled');
    fireEvent.click(globalEnabledCheckbox);
    
    // Wait for the auto-save to complete
    await waitFor(() => {
      expect(ConfigService.saveConfig).toHaveBeenCalled();
    });
    
    // Verify saveConfig was called with the updated config
    expect(ConfigService.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        globalEnabled: !DEFAULT_CONFIG.globalEnabled
      })
    );
  });

  it('should display saved status message after config change', async () => {
    render(<Options />);
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('general-settings')).toBeInTheDocument();
    });
    
    // Simulate a config change
    const globalEnabledCheckbox = screen.getByTestId('global-enabled');
    fireEvent.click(globalEnabledCheckbox);
    
    // Check that the saved message appears
    await waitFor(() => {
      expect(screen.getByText('Saved!')).toBeInTheDocument();
    });
  });

  it('should handle platform-specific settings changes with auto-save', async () => {
    render(<Options />);
    
    await waitFor(() => {
      expect(screen.getByTestId('platform-settings-zhihu')).toBeInTheDocument();
    });
    
    // Change analysis mode for Zhihu
    const zhihuAnalysisMode = screen.getByTestId('analysis-mode-zhihu');
    fireEvent.change(zhihuAnalysisMode, { target: { value: 'deep' } });
    
    await waitFor(() => {
      expect(ConfigService.saveConfig).toHaveBeenCalled();
    });
    
    expect(ConfigService.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        platformAnalysisModes: {
          ...DEFAULT_CONFIG.platformAnalysisModes,
          zhihu: 'deep'
        }
      })
    );
  });

  it('should handle theme changes with auto-save', async () => {
    render(<Options />);
    
    await waitFor(() => {
      expect(screen.getByTestId('theme-settings')).toBeInTheDocument();
    });
    
    // Change theme
    const themeSelect = screen.getByTestId('theme-select');
    fireEvent.change(themeSelect, { target: { value: 'zhihu-black' } });
    
    await waitFor(() => {
      expect(ConfigService.saveConfig).toHaveBeenCalled();
    });
    
    expect(ConfigService.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        themeId: 'zhihu-black'
      })
    );
  });

  it('should handle debug settings changes with auto-save', async () => {
    render(<Options />);
    
    await waitFor(() => {
      expect(screen.getByTestId('debug-settings')).toBeInTheDocument();
    });
    
    // Change debug setting
    const debugCheckbox = screen.getByTestId('debug-enabled');
    fireEvent.click(debugCheckbox);
    
    await waitFor(() => {
      expect(ConfigService.saveConfig).toHaveBeenCalled();
    });
    
    expect(ConfigService.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        enableDebug: !DEFAULT_CONFIG.enableDebug
      })
    );
  });

  it('should handle model selector changes with auto-save', async () => {
    render(<Options />);
    
    await waitFor(() => {
      expect(screen.getByTestId('model-selector')).toBeInTheDocument();
    });
    
    // Change model name
    const modelInput = screen.getByTestId('model-name');
    fireEvent.change(modelInput, { target: { value: 'gpt-4' } });
    
    await waitFor(() => {
      expect(ConfigService.saveConfig).toHaveBeenCalled();
    });
    
    expect(ConfigService.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        customModelNames: {
          ...DEFAULT_CONFIG.customModelNames,
          [DEFAULT_CONFIG.selectedProvider]: 'gpt-4'
        }
      })
    );
  });
});