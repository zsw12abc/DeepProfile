import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock I18nService
vi.mock('../services/I18nService', () => ({
  I18nService: {
    t: (key: string) => key,
    init: vi.fn(),
    getLanguage: () => 'zh-CN',
  }
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
      observe() {}
      disconnect() {}
      takeRecords() { return []; }
    } as any;
  });

  it('should be defined', () => {
    expect(RedditOverlay).toBeDefined();
  });
});