import React from 'react';
import { render, screen } from '@testing-library/react';
import { VersionInfo, getVersion, fetchChangelogContent } from './VersionInfo';



// Mock MarkdownRenderer
vi.mock('~components/MarkdownRenderer', () => ({
  default: ({ content }: { content: string }) => <div data-testid="markdown-renderer">{content}</div>,
}));

// Mock changelog content
vi.mock('data-text:./locales/zh-CN/CHANGELOG.md', () => ({
  default: 'Chinese Changelog Content'
}));
vi.mock('data-text:./locales/en-US/CHANGELOG.md', () => ({
  default: 'English Changelog Content'
}));

// Mock chrome runtime
const mockManifest = { version: '0.6.1' };
Object.defineProperty(chrome, 'runtime', {
  value: {
    getManifest: () => mockManifest,
  },
  writable: true,
});

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
      const originalRuntime = chrome.runtime;
      Object.defineProperty(chrome, 'runtime', {
        value: {
          getManifest: () => {
            throw new Error('Cannot get manifest');
          },
        },
        writable: true,
      });

      const version = getVersion();
      expect(version).toBe('0.6.2'); // This should be the fallback

      // Restore original runtime
      Object.defineProperty(chrome, 'runtime', {
        value: originalRuntime,
        writable: true,
      });
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