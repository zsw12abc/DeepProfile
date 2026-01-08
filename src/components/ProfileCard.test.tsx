import React from 'react';
import { render } from '@testing-library/react';
import { ProfileCard } from './ProfileCard';
import { DEFAULT_THEME } from '~types';

// Mock all external dependencies
vi.mock('~services/ZhihuClient', () => ({
  ZhihuClient: {
    fetchImageAsBase64: vi.fn()
  },
  calculateFinalLabel: vi.fn().mockReturnValue({ label: 'Test Label', percentage: 80 })
}));

vi.mock('~services/LabelUtils', () => ({
  calculateFinalLabel: vi.fn().mockReturnValue({ label: 'Test Label', percentage: 80 })
}));

vi.mock('~services/TopicService', () => ({
  TopicService: {
    classify: vi.fn(),
    getCategoryName: vi.fn()
  }
}));

vi.mock('~services/ExportService', () => ({
  ExportService: {
    toMarkdown: vi.fn()
  }
}));

vi.mock('~services/ThemeService', () => ({
  ThemeService: {
    getInstance: vi.fn().mockReturnValue({
      initialize: vi.fn(),
      getCurrentTheme: vi.fn().mockReturnValue(DEFAULT_THEME)
    })
  }
}));

vi.mock('html2canvas', () => ({
  default: vi.fn()
}));

vi.mock('data-base64:../../assets/icon.png', () => ('test-icon-data'));

vi.mock('~services/I18nService', () => ({
  I18nService: {
    t: (key: string) => key,
    init: vi.fn(),
    getLanguage: vi.fn().mockReturnValue('en-US')
  }
}));

describe('ProfileCard', () => {
  it('should render with default theme', () => {
    // 检查 DEFAULT_THEME 是否可访问
    expect(DEFAULT_THEME).toBeDefined();
    expect(DEFAULT_THEME.id).toBe('default');
    
    // 尝试渲染组件（最小化 props）
    const { container } = render(
      <ProfileCard
        userId="test-user"
        profileData={null}
        loading={false}
        onClose={() => {}}
        initialNickname="Test User"
      />
    );
    
    // 验证组件是否渲染成功
    expect(container).toBeTruthy();
  });
});