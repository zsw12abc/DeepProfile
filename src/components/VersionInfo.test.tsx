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
vi.mock('../locales/zh-CN', () => ({
  zhCNChangelog: '# DeepProfile 当前版本更新日志\n\n## 当前版本: v0.6.2 (Beta)',
  zhCNVersionHistory: '# DeepProfile 版本历史\n\n### v0.6.1 (2024-01-09) - 实时保存设置'
}));
vi.mock('../locales/en-US', () => ({
  enUSChangelog: '# DeepProfile Current Version Changelog\n\n## Current Version: v0.6.2 (Beta)',
  enUSVersionHistory: '# DeepProfile Version History\n\n### v0.6.1 (2024-01-09) - Real-time Settings Save'
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
    render(<VersionInfo changelog="Test changelog content" versionHistory="Test version history content" />);

    expect(screen.getByText('版本信息')).toBeInTheDocument();
    expect(screen.getByText(/当前版本/)).toBeInTheDocument();
    expect(screen.getByText('v0.6.1')).toBeInTheDocument();
  });

  it('renders changelog content', () => {
    const testChangelog = 'This is test changelog content';
    const testVersionHistory = 'This is test version history content';
    render(<VersionInfo changelog={testChangelog} versionHistory={testVersionHistory} />);

    expect(screen.getByText(testChangelog)).toBeInTheDocument();
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
    it('returns Chinese changelog and version history content when language is zh-CN', async () => {
      const content = await fetchChangelogContent('zh-CN');
      expect(content.changelog).toBe('# DeepProfile 当前版本更新日志\n\n## 当前版本: v0.6.2 (Beta)');
      expect(content.versionHistory).toBe('# DeepProfile 版本历史\n\n### v0.6.1 (2024-01-09) - 实时保存设置');
    });

    it('returns English changelog and version history content when language is en-US', async () => {
      const content = await fetchChangelogContent('en-US');
      expect(content.changelog).toBe('# DeepProfile Current Version Changelog\n\n## Current Version: v0.6.2 (Beta)');
      expect(content.versionHistory).toBe('# DeepProfile Version History\n\n### v0.6.1 (2024-01-09) - Real-time Settings Save');
    });

    it('returns English changelog and version history content for unknown language', async () => {
      const content = await fetchChangelogContent('fr-FR');
      expect(content.changelog).toBe('# DeepProfile Current Version Changelog\n\n## Current Version: v0.6.2 (Beta)');
      expect(content.versionHistory).toBe('# DeepProfile Version History\n\n### v0.6.1 (2024-01-09) - Real-time Settings Save');
    });
  });

  it('renders multiple sections', () => {
    render(<VersionInfo changelog="Test changelog content" versionHistory="Test version history content" />);

    expect(screen.getByText('更新日志')).toBeInTheDocument();
    expect(screen.getByText('版本历史')).toBeInTheDocument();
  });
});