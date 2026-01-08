import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { 
  GeneralSettings, 
  PlatformSpecificSettings, 
  DebugSettings,
  PROVIDERS,
  LANGUAGES 
} from './PlatformSettings';



// Mock AppConfig type
type MockAppConfig = {
  globalEnabled: boolean;
  language: string;
  selectedProvider: string;
  apiKeys: Record<string, string>;
  customBaseUrls: Record<string, string>;
  customModelNames?: Record<string, string>;
  platformAnalysisModes?: {
    zhihu?: string;
    reddit?: string;
  };
  analyzeLimit?: number;
  enableDebug?: boolean;
};

describe('PlatformSettings', () => {
  const mockConfig: MockAppConfig = {
    globalEnabled: true,
    language: 'zh-CN',
    selectedProvider: 'openai',
    apiKeys: { openai: 'test-key' },
    customBaseUrls: { openai: 'https://api.openai.com' },
    platformAnalysisModes: { zhihu: 'balanced', reddit: 'fast' },
    analyzeLimit: 15,
  };

  const mockSetConfig = vi.fn();
  const mockHandleTestConnection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GeneralSettings', () => {
    it('renders general settings form', () => {
      render(
        <GeneralSettings
          config={mockConfig}
          setConfig={mockSetConfig}
          isTesting={false}
          testResult={null}
          handleTestConnection={mockHandleTestConnection}
          renderModelSelector={() => <div>Model Selector</div>}
        />
      );

      expect(screen.getByText('通用设置')).toBeInTheDocument();
      expect(screen.getByText('插件已启用')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('请输入 API Key')).toBeInTheDocument();
    });

    it('triggers test connection handler', () => {
      render(
        <GeneralSettings
          config={mockConfig}
          setConfig={mockSetConfig}
          isTesting={false}
          testResult={null}
          handleTestConnection={mockHandleTestConnection}
          renderModelSelector={() => <div>Model Selector</div>}
        />
      );

      fireEvent.click(screen.getByText('测试连接'));
      expect(mockHandleTestConnection).toHaveBeenCalledTimes(1);
    });
  });

  describe('PlatformSpecificSettings', () => {
    it('renders Zhihu settings', () => {
      render(
        <PlatformSpecificSettings
          config={mockConfig}
          setConfig={mockSetConfig}
          platform="zhihu"
        />
      );

      expect(screen.getByText('知乎设置')).toBeInTheDocument();
      expect(screen.getByText('平衡')).toBeInTheDocument();
    });

    it('renders Reddit settings', () => {
      render(
        <PlatformSpecificSettings
          config={mockConfig}
          setConfig={mockSetConfig}
          platform="reddit"
        />
      );

      expect(screen.getByText('Reddit设置')).toBeInTheDocument();
      expect(screen.getByText('快速')).toBeInTheDocument();
    });

    it('updates analysis mode when button clicked', () => {
      render(
        <PlatformSpecificSettings
          config={mockConfig}
          setConfig={mockSetConfig}
          platform="zhihu"
        />
      );

      fireEvent.click(screen.getByText('深度'));
      expect(mockSetConfig).toHaveBeenCalledWith({
        ...mockConfig,
        platformAnalysisModes: {
          ...mockConfig.platformAnalysisModes,
          zhihu: 'deep'
        }
      });
    });
  });

  describe('DebugSettings', () => {
    it('renders debug settings', () => {
      render(
        <DebugSettings
          config={mockConfig}
          setConfig={mockSetConfig}
        />
      );

      expect(screen.getByText('调试设置')).toBeInTheDocument();
      expect(screen.getByLabelText('调试模式')).toBeInTheDocument();
    });

    it('handles debug toggle', () => {
      render(
        <DebugSettings
          config={mockConfig}
          setConfig={mockSetConfig}
        />
      );

      const checkbox = screen.getByLabelText('调试模式');
      fireEvent.click(checkbox);
      expect(mockSetConfig).toHaveBeenCalledWith({
        ...mockConfig,
        enableDebug: true
      });
    });
  });

  describe('Constants', () => {
    it('PROVIDERS array has correct structure', () => {
      expect(PROVIDERS).toBeInstanceOf(Array);
      expect(PROVIDERS[0]).toHaveProperty('value');
      expect(PROVIDERS[0]).toHaveProperty('label');
    });

    it('LANGUAGES array has correct structure', () => {
      expect(LANGUAGES).toBeInstanceOf(Array);
      expect(LANGUAGES[0]).toHaveProperty('value');
      expect(LANGUAGES[0]).toHaveProperty('label');
    });
  });
});