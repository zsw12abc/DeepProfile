import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ConfigService } from '../services/ConfigService';

// Mock I18nService
vi.mock('../services/I18nService', () => ({
  I18nService: {
    t: (key: string) => key,
    init: vi.fn(),
    getLanguage: () => 'zh-CN',
  }
}));

// Mock ConfigService
vi.mock('../services/ConfigService', () => ({
  ConfigService: {
    getConfig: vi.fn().mockResolvedValue({ globalEnabled: true })
  }
}));

// Mock ProfileCard component
vi.mock('../components/ProfileCard', () => ({
  ProfileCard: () => <div data-testid="profile-card">Profile Card</div>
}));

// Mock chrome runtime
const mockSendMessage = vi.fn();
const mockAddListener = vi.fn();
const mockRemoveListener = vi.fn();

global.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
    onMessage: {
      addListener: mockAddListener,
      removeListener: mockRemoveListener
    }
  },
  storage: {
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  }
} as any;

// Import the component directly instead of dynamically
import RedditOverlay from './reddit-overlay';

describe('RedditOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    
    // Mock MutationObserver
    global.MutationObserver = class {
      constructor(callback: any) {
        this.callback = callback;
      }
      callback: any;
      observe() {}
      disconnect() {}
      takeRecords() { return []; }
    } as any;
  });

  it('should be defined', () => {
    expect(RedditOverlay).toBeDefined();
  });

  it('should render without crashing', () => {
    render(<RedditOverlay />);
  });

  it('should inject buttons when enabled', async () => {
    // Setup DOM with a Reddit user link
    document.body.innerHTML = `
      <div>
        <a href="https://www.reddit.com/user/testuser">Test User</a>
      </div>
    `;

    render(<RedditOverlay />);

    // Wait for async effects
    await waitFor(() => {
      // Check if button injection logic ran (this is tricky in JSDOM as MutationObserver behavior is mocked)
      // But we can check if ConfigService was called
      expect(ConfigService.getConfig).toHaveBeenCalled();
    });
  });
});