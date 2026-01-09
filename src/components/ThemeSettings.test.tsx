import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ThemeSettings from './ThemeSettings';
import { ThemeService } from '../services/ThemeService';
import { I18nService } from '../services/I18nService';
import { ZHIHU_WHITE_THEME } from '../types';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../services/I18nService', () => ({
  I18nService: {
    t: (key: string) => key,
  }
}));

vi.mock('../services/ThemeService', () => ({
  ThemeService: {
    getInstance: () => ({
      getAllThemes: vi.fn().mockResolvedValue([ZHIHU_WHITE_THEME]),
      getCurrentTheme: vi.fn().mockReturnValue(ZHIHU_WHITE_THEME),
      applyTheme: vi.fn().mockResolvedValue(undefined),
      addTheme: vi.fn().mockResolvedValue(undefined),
      deleteTheme: vi.fn().mockResolvedValue(undefined),
    }),
  }
}));

describe('ThemeSettings', () => {
  const mockConfig = {
    themeId: 'zhihu-white',
    themes: { 'zhihu-white': ZHIHU_WHITE_THEME }
  } as any;
  
  const mockSetConfig = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders theme settings', async () => {
    render(<ThemeSettings config={mockConfig} setConfig={mockSetConfig} />);

    await waitFor(() => {
      expect(screen.getByText('theme_settings')).toBeInTheDocument();
      expect(screen.getByText('select_theme')).toBeInTheDocument();
    });
  });

  it('loads and displays themes', async () => {
    render(<ThemeSettings config={mockConfig} setConfig={mockSetConfig} />);

    await waitFor(() => {
      // Assuming ZHIHU_WHITE_THEME has a name or we mock getLocalizedThemeInfo
      // Since getLocalizedThemeInfo is internal, we rely on what's rendered.
      // The component uses I18nService.t('theme_zhihu_white_name') for built-in themes.
      expect(screen.getByText('theme_zhihu_white_name')).toBeInTheDocument();
    });
  });

  it('handles theme selection', async () => {
    render(<ThemeSettings config={mockConfig} setConfig={mockSetConfig} />);

    await waitFor(() => {
      expect(screen.getByText('theme_zhihu_white_name')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('theme_zhihu_white_name'));
    
    await waitFor(() => {
      expect(mockSetConfig).toHaveBeenCalledWith(expect.objectContaining({ themeId: 'zhihu-white' }));
    });
  });

  it('handles creating custom theme', async () => {
    render(<ThemeSettings config={mockConfig} setConfig={mockSetConfig} />);

    fireEvent.change(screen.getByPlaceholderText('unique_theme_identifier'), { target: { value: 'custom-theme' } });
    fireEvent.change(screen.getByPlaceholderText('display_name_for_theme'), { target: { value: 'Custom Theme' } });
    
    fireEvent.click(screen.getByText('create_theme'));

    await waitFor(() => {
      expect(screen.getByText('theme_created')).toBeInTheDocument();
    });
  });
});
