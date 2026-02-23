import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, waitFor } from "@testing-library/react";
import { ConfigService } from "../services/ConfigService";

vi.mock("../services/I18nService", () => ({
  I18nService: {
    t: (key: string) => key,
    init: vi.fn(),
    getLanguage: () => "zh-CN",
  },
}));

vi.mock("../services/ConfigService", () => ({
  ConfigService: {
    getConfig: vi.fn().mockResolvedValue({
      globalEnabled: true,
      platformConfigs: {
        twitter: {
          analysisButtonEnabled: true,
        },
      },
    }),
  },
}));

vi.mock("../components/ProfileCard", () => ({
  ProfileCard: () => <div data-testid="profile-card">Profile Card</div>,
}));

const mockSendMessage = vi.fn();
const mockAddListener = vi.fn();
const mockRemoveListener = vi.fn();

global.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
    onMessage: {
      addListener: mockAddListener,
      removeListener: mockRemoveListener,
    },
  },
  storage: {
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
} as any;

import TwitterOverlay from "./twitter-overlay";

describe("TwitterOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";

    global.MutationObserver = class {
      constructor(callback: any) {
        this.callback = callback;
      }
      callback: any;
      observe() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as any;
  });

  it("should be defined", () => {
    expect(TwitterOverlay).toBeDefined();
  });

  it("should render without crashing", () => {
    render(<TwitterOverlay />);
  });

  it("should read config and register listeners", async () => {
    render(<TwitterOverlay />);

    await waitFor(() => {
      expect(ConfigService.getConfig).toHaveBeenCalled();
      expect(mockAddListener).toHaveBeenCalled();
      expect(chrome.storage.onChanged.addListener).toHaveBeenCalled();
    });
  });
});
