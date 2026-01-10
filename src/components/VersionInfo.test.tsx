import React from 'react';
import { render, screen } from '@testing-library/react';
import { VersionInfo, getVersion, fetchChangelogContent } from './VersionInfo';
import { vi, describe, it, expect } from 'vitest';

// Mock I18nService
vi.mock('~services/I18nService', () => ({
  I18nService: {
    t: (key: string) => {
      const map: Record<string, string> = {
        'version_info': '版本信息',
        'current_version': '当前版本',
        'changelog': '更新日志',
        'version_history': '版本历史'
      };
      return map[key] || key;
    }
  }
}));

// Mock UIComponents
vi.mock('./UIComponents', () => ({
  Card: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="card">
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

// Mock MarkdownRenderer
vi.mock('~components/MarkdownRenderer', () => ({
  default: ({ content }: { content: string }) => <div data-testid="markdown-renderer">{content}</div>,
}));

// Mock changelog content - Updated to reflect new import paths
vi.mock('../locales/zh-CN/CHANGELOG', () => ({
  zhCNChangelog: 'Chinese Changelog Content'
}));
vi.mock('../locales/en-US/CHANGELOG', () => ({
  enUSChangelog: 'English Changelog Content'
}));

// Mock chrome runtime
const mockManifest = { version: '0.6.1' };
global.chrome = {
  runtime: {
    getManifest: () => mockManifest,
  },
} as any;

describe('VersionInfo', () => {
  it('renders version info section', () => {
    render(<VersionInfo changelog="Test changelog content" />);

    expect(screen.getByText('版本信息')).toBeInTheDocument();
    expect(screen.getByText(/当前版本/)).toBeInTheDocument();
    expect(screen.getByText('v0.6.1')).toBeInTheDocument();
  });

  it('renders changelog content', () => {
    const testChangelog = 'This is test changelog content';
    render(<VersionInfo changelog={testChangelog} />);

    expect(screen.getAllByText(testChangelog)).toHaveLength(2); // Two instances in the component
  });

  describe('getVersion', () => {
    it('returns version from manifest', () => {
      const version = getVersion();
      expect(version).toBe('0.6.1');
    });

    it('returns fallback version when manifest unavailable', () => {
      // Temporarily override the mock to simulate an error
      const originalRuntime = global.chrome.runtime;
      global.chrome.runtime = {
        getManifest: () => {
          throw new Error('Cannot get manifest');
        },
      } as any;

      const version = getVersion();
      expect(version).toBe('0.6.2'); // This should be the fallback

      // Restore original runtime
      global.chrome.runtime = originalRuntime;
    });
  });

  describe('fetchChangelogContent', () => {
    it('returns Chinese changelog content when language is zh-CN', async () => {
      const content = await fetchChangelogContent('zh-CN');
      expect(content).toBe('Chinese Changelog Content');
    });

    it('returns English changelog content when language is en-US', async () => {
      const content = await fetchChangelogContent('en-US');
      expect(content).toBe('English Changelog Content');
    });

    it('returns English changelog content for unknown language', async () => {
      const content = await fetchChangelogContent('fr-FR');
      expect(content).toBe('English Changelog Content');
    });
  });

  it('renders multiple sections', () => {
    render(<VersionInfo changelog="Test changelog content" />);

    expect(screen.getByText('更新日志')).toBeInTheDocument();
    expect(screen.getByText('版本历史')).toBeInTheDocument();
  });
});