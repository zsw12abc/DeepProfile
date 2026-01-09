import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileCard } from './ProfileCard';
import { I18nService } from '../services/I18nService';
import { ThemeService } from '../services/ThemeService';
import { TopicService } from '../services/TopicService';
import { ExportService } from '../services/ExportService';
import { ZhihuClient } from '../services/ZhihuClient';
import { ZHIHU_WHITE_THEME } from '../types';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../services/I18nService', () => ({
  I18nService: {
    t: (key: string) => key,
    getLanguage: () => 'zh-CN',
  }
}));

vi.mock('../services/ThemeService', () => ({
  ThemeService: {
    getInstance: () => ({
      initialize: vi.fn(),
      getCurrentTheme: () => ZHIHU_WHITE_THEME,
    }),
  }
}));

vi.mock('../services/TopicService', () => ({
  TopicService: {
    classify: vi.fn(() => 'tech'),
    getCategoryName: vi.fn(() => 'Technology'),
  }
}));

vi.mock('../services/ExportService', () => ({
  ExportService: {
    toMarkdown: vi.fn(() => '# Markdown Content'),
  }
}));

vi.mock('../services/ZhihuClient', () => ({
  ZhihuClient: {
    fetchImageAsBase64: vi.fn().mockResolvedValue('base64image'),
  }
}));

vi.mock('../services/LabelUtils', () => ({
  calculateFinalLabel: (label: string, score: number) => ({ label, percentage: Math.abs(score) * 100 }),
}));

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => 'data:image/png;base64,fakeimage',
  }),
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:url');
global.URL.revokeObjectURL = vi.fn();

describe('ProfileCard', () => {
  const mockRecord = {
    userId: 'user123',
    platform: 'zhihu' as const,
    nickname: 'Test User',
    profileData: {
      nickname: 'Test User',
      topic_classification: 'Tech',
      value_orientation: [
        { label: 'innovation', score: 0.8 }
      ],
      summary: 'Test summary',
      evidence: [
        { quote: 'Test quote', analysis: 'Test analysis', source_title: 'Test source', source_id: '1' }
      ]
    },
    items: [{ id: '1', title: 'Test source', url: 'http://example.com' }],
    userProfile: {
      name: 'Test User',
      avatar_url: 'http://example.com/avatar.jpg',
      headline: 'Headline',
      url_token: 'user123'
    },
    debugInfo: {
      totalDurationMs: 1000,
      llmDurationMs: 500,
      itemsCount: 10,
      model: 'gpt-4'
    },
    fromCache: false,
    cachedAt: 0,
    cachedContext: ''
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders profile card with data', async () => {
    render(
      <ProfileCard
        record={mockRecord}
        platform="zhihu"
        isLoading={false}
      />
    );

    // Wait for theme to load
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    expect(screen.getByText('Tech')).toBeInTheDocument();
    expect(screen.getByText('Test summary')).toBeInTheDocument();
    expect(screen.getByText('innovation')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <ProfileCard
        record={{ ...mockRecord, profileData: null }}
        platform="zhihu"
        isLoading={true}
        statusMessage="Loading..."
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles export markdown', async () => {
    render(
      <ProfileCard
        record={mockRecord}
        platform="zhihu"
        isLoading={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByTitle('export_markdown')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('export_markdown'));
    expect(ExportService.toMarkdown).toHaveBeenCalled();
  });

  it('handles export image', async () => {
    render(
      <ProfileCard
        record={mockRecord}
        platform="zhihu"
        isLoading={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByTitle('export_image')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('export_image'));
    // Since html2canvas is mocked, we just check if the button click doesn't crash
    // and potentially check if loading state changes if we could inspect state.
    // We can check if ZhihuClient.fetchImageAsBase64 is called which happens during export
    await waitFor(() => {
      expect(ZhihuClient.fetchImageAsBase64).toHaveBeenCalled();
    });
  });

  it('toggles evidence section', async () => {
    render(
      <ProfileCard
        record={mockRecord}
        platform="zhihu"
        isLoading={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('evidence')).toBeInTheDocument();
    });

    const expandButton = screen.getByText('expand');
    fireEvent.click(expandButton);

    expect(screen.getByText('Test quote')).toBeInTheDocument();
    expect(screen.getByText('Test analysis')).toBeInTheDocument();
  });

  it('toggles debug info', async () => {
    render(
      <ProfileCard
        record={mockRecord}
        platform="zhihu"
        isLoading={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('debug_info')).toBeInTheDocument();
    });

    const expandButton = screen.getAllByText('expand')[1]; // Second expand button (first is evidence)
    fireEvent.click(expandButton);

    expect(screen.getByText(/gpt-4/)).toBeInTheDocument();
  });
});
