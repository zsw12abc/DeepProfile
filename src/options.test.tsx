import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Options from './options';
import { ConfigService } from './services/ConfigService';
import { HistoryService } from './services/HistoryService';
import { I18nService } from './services/I18nService';
import { ThemeService } from './services/ThemeService';
import { DEFAULT_CONFIG } from './types';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('./services/ConfigService', () => ({
  ConfigService: {
    getConfig: vi.fn(),
    saveConfig: vi.fn(),
  }
}));

vi.mock('./services/HistoryService', () => ({
  HistoryService: {
    getAllUserRecords: vi.fn(),
    deleteProfile: vi.fn(),
    deleteUserRecord: vi.fn(),
    clearAll: vi.fn(),
  }
}));

vi.mock('./services/I18nService', () => ({
  I18nService: {
    t: (key: string) => key,
    setLanguage: vi.fn(),
    getLanguage: () => 'zh-CN',
  }
}));

vi.mock('./services/ThemeService', () => ({
  ThemeService: {
    getInstance: () => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      getCurrentTheme: () => ({
        colors: {},
        typography: {},
        spacing: {},
        borderRadius: {},
        shadows: {}
      }),
    }),
  }
}));

vi.mock('./services/LabelDefinitions', () => ({
  invalidateLabelCache: vi.fn(),
}));

// Mock components
vi.mock('./components/PlatformSettings', () => ({
  GeneralSettings: () => <div data-testid="general-settings">General Settings</div>,
  PlatformSpecificSettings: ({ platform }: { platform: string }) => <div data-testid={`platform-settings-${platform}`}>{platform} Settings</div>,
  DebugSettings: () => <div data-testid="debug-settings">Debug Settings</div>,
}));

vi.mock('./components/HistorySection', () => ({
  HistorySection: () => <div data-testid="history-section">History Section</div>,
}));

vi.mock('./components/VersionInfo', () => ({
  VersionInfo: () => <div data-testid="version-info">Version Info</div>,
}));

vi.mock('./components/ThemeSettings', () => ({
  default: () => <div data-testid="theme-settings">Theme Settings</div>,
}));

vi.mock('./components/ModelSelector', () => ({
  ModelSelector: () => <div data-testid="model-selector">Model Selector</div>,
}));

// Mock assets
vi.mock('./assets/icon.png', () => ({
  default: 'icon.png'
}));

// Mock locales
vi.mock('./locales/zh-CN/CHANGELOG.md', () => ({
  default: 'Chinese Changelog'
}));
vi.mock('./locales/en-US/CHANGELOG.md', () => ({
  default: 'English Changelog'
}));

describe('Options Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ConfigService.getConfig).mockResolvedValue(DEFAULT_CONFIG);
    vi.mocked(HistoryService.getAllUserRecords).mockResolvedValue([]);
  });

  it('renders options page with default general settings', async () => {
    render(<Options />);

    await waitFor(() => {
      expect(screen.getByText('DeepProfile')).toBeInTheDocument();
      expect(screen.getByTestId('general-settings')).toBeInTheDocument();
    });
  });

  it('switches tabs correctly', async () => {
    render(<Options />);

    await waitFor(() => {
      expect(screen.getByText('settings_zhihu')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('settings_zhihu'));
    expect(screen.getByTestId('platform-settings-zhihu')).toBeInTheDocument();

    fireEvent.click(screen.getByText('settings_reddit'));
    expect(screen.getByTestId('platform-settings-reddit')).toBeInTheDocument();

    fireEvent.click(screen.getByText('settings_history'));
    expect(screen.getByTestId('history-section')).toBeInTheDocument();

    fireEvent.click(screen.getByText('settings_debug'));
    expect(screen.getByTestId('debug-settings')).toBeInTheDocument();

    fireEvent.click(screen.getByText('version_info'));
    expect(screen.getByTestId('version-info')).toBeInTheDocument();
  });

  it('loads history when history tab is active', async () => {
    render(<Options />);

    await waitFor(() => {
      expect(screen.getByText('settings_history')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('settings_history'));

    await waitFor(() => {
      expect(HistoryService.getAllUserRecords).toHaveBeenCalled();
    });
  });
});
