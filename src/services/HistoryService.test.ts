import { describe, it, expect, vi, beforeEach } from "vitest";
import { HistoryService } from "./HistoryService";
import type { UserHistoryRecord, SupportedPlatform } from "~types";

// Mock chrome.storage.local
const storageMock = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
};

global.chrome = {
  storage: {
    local: storageMock,
  },
} as any;

describe("HistoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveProfile", () => {
    it("should save a new user profile", async () => {
      storageMock.get.mockResolvedValue({});

      await HistoryService.saveProfile(
        "user1",
        "zhihu" as SupportedPlatform,
        "tech",
        { summary: "test" },
        "context",
        "gpt-4",
        { name: "User 1" },
      );

      expect(storageMock.set).toHaveBeenCalledWith(
        expect.objectContaining({
          deep_profile_history: expect.arrayContaining([
            expect.objectContaining({
              userId: "user1",
              platform: "zhihu",
              profiles: expect.objectContaining({
                tech: expect.objectContaining({
                  category: "tech",
                  profileData: { summary: "test" },
                }),
              }),
            }),
          ]),
        }),
      );
    });

    it("should update existing user profile", async () => {
      const existingRecord: UserHistoryRecord = {
        userId: "user1",
        platform: "zhihu" as SupportedPlatform,
        profiles: {
          old_cat: {
            category: "old_cat",
            profileData: { summary: "old" },
            timestamp: Date.now() - 1000,
            model: "gpt-3.5",
            context: "",
          },
        },
        lastUpdated: Date.now() - 1000,
      };

      storageMock.get.mockResolvedValue({
        deep_profile_history: [existingRecord],
      });

      await HistoryService.saveProfile(
        "user1",
        "zhihu" as SupportedPlatform,
        "new_cat",
        { summary: "new" },
        "context",
        "gpt-4",
        { name: "Updated User 1" },
      );

      const callArg = storageMock.set.mock.calls[0][0];
      expect(callArg.deep_profile_history).toHaveLength(1);
      expect(callArg.deep_profile_history[0].profiles).toHaveProperty(
        "new_cat",
      );
      // The old category should still exist since we didn't delete it
      expect(callArg.deep_profile_history[0].profiles).toHaveProperty(
        "old_cat",
      );
      expect(callArg.deep_profile_history[0].userInfo.name).toBe(
        "Updated User 1",
      );
    });

    it("should limit history to MAX_USERS", async () => {
      const largeHistory: UserHistoryRecord[] = [];
      for (let i = 0; i < 300; i++) {
        largeHistory.push({
          userId: `user${i}`,
          platform: "zhihu" as SupportedPlatform,
          profiles: {
            tech: {
              category: "tech",
              profileData: { summary: `test${i}` },
              timestamp: Date.now() - 1000,
              model: "gpt-4",
              context: "",
            },
          },
          lastUpdated: Date.now() - 1000,
        });
      }

      storageMock.get.mockResolvedValue({ deep_profile_history: largeHistory });

      await HistoryService.saveProfile(
        "newUser",
        "zhihu" as SupportedPlatform,
        "tech",
        { summary: "new" },
        "context",
        "gpt-4",
      );

      const callArg = storageMock.set.mock.calls[0][0];
      // Should be limited to MAX_USERS (200) + 1 new user = 201? No, should be trimmed to MAX_USERS (200)
      // Actually, it should be 200 as per the implementation
      expect(callArg.deep_profile_history).toHaveLength(200);
    });
  });

  describe("getProfile", () => {
    it("should return a specific category profile", async () => {
      const record: UserHistoryRecord = {
        userId: "user1",
        platform: "zhihu" as SupportedPlatform,
        profiles: {
          tech: {
            category: "tech",
            profileData: { summary: "test" },
            timestamp: Date.now(),
            model: "gpt-4",
            context: "",
          },
        },
        lastUpdated: Date.now(),
      };

      storageMock.get.mockResolvedValue({ deep_profile_history: [record] });

      const result = await HistoryService.getProfile(
        "user1",
        "zhihu" as SupportedPlatform,
        "tech",
      );

      expect(result).toEqual(record.profiles?.tech);
    });

    it("should return null for non-existent user", async () => {
      storageMock.get.mockResolvedValue({ deep_profile_history: [] });

      const result = await HistoryService.getProfile(
        "nonexistent",
        "zhihu" as SupportedPlatform,
        "tech",
      );

      expect(result).toBeNull();
    });

    it("should return null for expired profile", async () => {
      const expiredTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      const record: UserHistoryRecord = {
        userId: "user1",
        platform: "zhihu" as SupportedPlatform,
        profiles: {
          tech: {
            category: "tech",
            profileData: { summary: "test" },
            timestamp: expiredTimestamp,
            model: "gpt-4",
            context: "",
          },
        },
        lastUpdated: expiredTimestamp,
      };

      // Mock the storage to return both the initial history and then the cleaned history
      storageMock.get.mockResolvedValue({ deep_profile_history: [record] });

      const result = await HistoryService.getProfile(
        "user1",
        "zhihu" as SupportedPlatform,
        "tech",
      );

      expect(result).toBeNull();
    });
  });

  describe("getUserRecord", () => {
    it("should return the full user record", async () => {
      const record: UserHistoryRecord = {
        userId: "user1",
        platform: "zhihu" as SupportedPlatform,
        profiles: {
          tech: {
            category: "tech",
            profileData: { summary: "test" },
            timestamp: Date.now(),
            model: "gpt-4",
            context: "",
          },
        },
        lastUpdated: Date.now(),
      };

      storageMock.get.mockResolvedValue({ deep_profile_history: [record] });

      const result = await HistoryService.getUserRecord(
        "user1",
        "zhihu" as SupportedPlatform,
      );

      expect(result).toEqual(record);
    });

    it("should return null for non-existent user", async () => {
      storageMock.get.mockResolvedValue({ deep_profile_history: [] });

      const result = await HistoryService.getUserRecord(
        "nonexistent",
        "zhihu" as SupportedPlatform,
      );

      expect(result).toBeNull();
    });
  });

  describe("getAllUserRecords", () => {
    it("should return all user records", async () => {
      const records: UserHistoryRecord[] = [
        {
          userId: "user1",
          platform: "zhihu" as SupportedPlatform,
          profiles: {
            tech: {
              category: "tech",
              profileData: { summary: "test" },
              timestamp: Date.now(),
              model: "gpt-4",
              context: "",
            },
          },
          lastUpdated: Date.now(),
        },
      ];

      storageMock.get.mockResolvedValue({ deep_profile_history: records });

      const result = await HistoryService.getAllUserRecords();

      expect(result).toEqual(records);
    });

    it("should clean up expired records", async () => {
      const expiredTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      const validRecord: UserHistoryRecord = {
        userId: "validUser",
        platform: "zhihu" as SupportedPlatform,
        profiles: {
          tech: {
            category: "tech",
            profileData: { summary: "valid" },
            timestamp: Date.now(),
            model: "gpt-4",
            context: "",
          },
        },
        lastUpdated: Date.now(),
      };
      const expiredRecord: UserHistoryRecord = {
        userId: "expiredUser",
        platform: "zhihu" as SupportedPlatform,
        profiles: {
          tech: {
            category: "tech",
            profileData: { summary: "expired" },
            timestamp: expiredTimestamp,
            model: "gpt-4",
            context: "",
          },
        },
        lastUpdated: expiredTimestamp,
      };

      storageMock.get.mockResolvedValue({
        deep_profile_history: [validRecord, expiredRecord],
      });

      const result = await HistoryService.getAllUserRecords();

      // The expired record should be filtered out
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("validUser");
      // Storage should have been updated to remove expired records
      expect(storageMock.set).toHaveBeenCalled();
    });
  });

  describe("deleteProfile", () => {
    it("should delete specific profile", async () => {
      const record: UserHistoryRecord = {
        userId: "user1",
        platform: "zhihu" as SupportedPlatform,
        profiles: {
          tech: {
            category: "tech",
            profileData: { summary: "tech test" },
            timestamp: Date.now(),
            model: "gpt-4",
            context: "",
          },
          life: {
            category: "life",
            profileData: { summary: "life test" },
            timestamp: Date.now(),
            model: "gpt-4",
            context: "",
          },
        },
        lastUpdated: Date.now(),
      };

      storageMock.get.mockResolvedValue({ deep_profile_history: [record] });

      await HistoryService.deleteProfile(
        "user1",
        "zhihu" as SupportedPlatform,
        "tech",
      );

      const callArg = storageMock.set.mock.calls[0][0];
      expect(callArg.deep_profile_history[0].profiles).not.toHaveProperty(
        "tech",
      );
      expect(callArg.deep_profile_history[0].profiles).toHaveProperty("life");
    });

    it("should remove user record if no profiles left", async () => {
      const record: UserHistoryRecord = {
        userId: "user1",
        platform: "zhihu" as SupportedPlatform,
        profiles: {
          tech: {
            category: "tech",
            profileData: { summary: "tech test" },
            timestamp: Date.now(),
            model: "gpt-4",
            context: "",
          },
        },
        lastUpdated: Date.now(),
      };

      storageMock.get.mockResolvedValue({ deep_profile_history: [record] });

      await HistoryService.deleteProfile(
        "user1",
        "zhihu" as SupportedPlatform,
        "tech",
      );

      const callArg = storageMock.set.mock.calls[0][0];
      expect(callArg.deep_profile_history).toHaveLength(0);
    });
  });

  describe("deleteUserRecord", () => {
    it("should delete entire user record", async () => {
      const records: UserHistoryRecord[] = [
        {
          userId: "user1",
          platform: "zhihu" as SupportedPlatform,
          profiles: {
            tech: {
              category: "tech",
              profileData: { summary: "test" },
              timestamp: Date.now(),
              model: "gpt-4",
              context: "",
            },
          },
          lastUpdated: Date.now(),
        },
        {
          userId: "user2",
          platform: "zhihu" as SupportedPlatform,
          profiles: {
            life: {
              category: "life",
              profileData: { summary: "test2" },
              timestamp: Date.now(),
              model: "gpt-4",
              context: "",
            },
          },
          lastUpdated: Date.now(),
        },
      ];

      storageMock.get.mockResolvedValue({ deep_profile_history: records });

      await HistoryService.deleteUserRecord(
        "user1",
        "zhihu" as SupportedPlatform,
      );

      const callArg = storageMock.set.mock.calls[0][0];
      expect(callArg.deep_profile_history).toHaveLength(1);
      expect(callArg.deep_profile_history[0].userId).toBe("user2");
    });
  });

  describe("clearAll", () => {
    it("should clear all history", async () => {
      await HistoryService.clearAll();

      expect(storageMock.remove).toHaveBeenCalledWith("deep_profile_history");
    });
  });

  describe("cleanupExpiredRecords", () => {
    it("should clean up expired records", async () => {
      const expiredTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      const validRecord: UserHistoryRecord = {
        userId: "validUser",
        platform: "zhihu" as SupportedPlatform,
        profiles: {
          tech: {
            category: "tech",
            profileData: { summary: "valid" },
            timestamp: Date.now(),
            model: "gpt-4",
            context: "",
          },
        },
        lastUpdated: Date.now(),
      };
      const expiredRecord: UserHistoryRecord = {
        userId: "expiredUser",
        platform: "zhihu" as SupportedPlatform,
        profiles: {
          tech: {
            category: "tech",
            profileData: { summary: "expired" },
            timestamp: expiredTimestamp,
            model: "gpt-4",
            context: "",
          },
        },
        lastUpdated: expiredTimestamp,
      };

      storageMock.get.mockResolvedValue({
        deep_profile_history: [validRecord, expiredRecord],
      });

      await HistoryService.cleanupExpiredRecords();

      // Storage should have been updated to remove expired records
      expect(storageMock.set).toHaveBeenCalled();
      const callArg = storageMock.set.mock.calls[0][0];
      expect(callArg.deep_profile_history).toHaveLength(1);
      expect(callArg.deep_profile_history[0].userId).toBe("validUser");
    });
  });
});
