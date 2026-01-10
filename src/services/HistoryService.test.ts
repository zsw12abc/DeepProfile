import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HistoryService } from './HistoryService';
import type { UserHistoryRecord, SupportedPlatform } from '~types';

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

describe('HistoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveProfile', () => {
    it('should save a new user profile', async () => {
      storageMock.get.mockResolvedValue({});
      
      await HistoryService.saveProfile(
        'user1',
        'zhihu',
        'tech',
        { summary: 'test' },
        'context',
        'gpt-4',
        { name: 'User 1' }
      );

      expect(storageMock.set).toHaveBeenCalledWith(expect.objectContaining({
        deep_profile_history: expect.arrayContaining([
          expect.objectContaining({
            userId: 'user1',
            platform: 'zhihu',
            profiles: expect.objectContaining({
              tech: expect.objectContaining({
                category: 'tech',
                profileData: { summary: 'test' }
              })
            })
          })
        ])
      }));
    });

    it('should update existing user profile', async () => {
      const existingHistory: UserHistoryRecord[] = [{
        userId: 'user1',
        platform: 'zhihu',
        profiles: {
          'old_cat': { category: 'old_cat', profileData: {}, timestamp: 0, context: '', model: '' }
        },
        lastUpdated: 0
      }];
      storageMock.get.mockResolvedValue({ deep_profile_history: existingHistory });

      await HistoryService.saveProfile(
        'user1',
        'zhihu',
        'new_cat',
        { summary: 'new' },
        'context',
        'gpt-4'
      );

      expect(storageMock.set).toHaveBeenCalled();
      const callArg = storageMock.set.mock.calls[0][0];
      const history = callArg.deep_profile_history;
      expect(history[0].profiles).toHaveProperty('new_cat');
      expect(history[0].profiles).toHaveProperty('old_cat');
    });
  });

  describe('getProfile', () => {
    it('should return cached profile if valid', async () => {
      const timestamp = Date.now();
      const history: UserHistoryRecord[] = [{
        userId: 'user1',
        platform: 'zhihu',
        profiles: {
          'tech': { 
            category: 'tech', 
            profileData: { summary: 'cached' }, 
            timestamp: timestamp, 
            context: '', 
            model: '' 
          }
        },
        lastUpdated: timestamp
      }];
      storageMock.get.mockResolvedValue({ deep_profile_history: history });

      const profile = await HistoryService.getProfile('user1', 'zhihu', 'tech');
      expect(profile).not.toBeNull();
      expect(profile?.profileData.summary).toBe('cached');
    });

    it('should return null if expired', async () => {
      const timestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const history: UserHistoryRecord[] = [{
        userId: 'user1',
        platform: 'zhihu',
        profiles: {
          'tech': { 
            category: 'tech', 
            profileData: { summary: 'cached' }, 
            timestamp: timestamp, 
            context: '', 
            model: '' 
          }
        },
        lastUpdated: timestamp
      }];
      storageMock.get.mockResolvedValue({ deep_profile_history: history });

      const profile = await HistoryService.getProfile('user1', 'zhihu', 'tech');
      expect(profile).toBeNull();
    });
  });

  describe('deleteProfile', () => {
    it('should delete specific profile', async () => {
      const history: UserHistoryRecord[] = [{
        userId: 'user1',
        platform: 'zhihu',
        profiles: {
          'tech': { category: 'tech', profileData: {}, timestamp: 0, context: '', model: '' },
          'life': { category: 'life', profileData: {}, timestamp: 0, context: '', model: '' }
        },
        lastUpdated: 0
      }];
      storageMock.get.mockResolvedValue({ deep_profile_history: history });

      await HistoryService.deleteProfile('user1', 'zhihu', 'tech');

      const callArg = storageMock.set.mock.calls[0][0];
      const updatedHistory = callArg.deep_profile_history;
      expect(updatedHistory[0].profiles).not.toHaveProperty('tech');
      expect(updatedHistory[0].profiles).toHaveProperty('life');
    });

    it('should remove user record if no profiles left', async () => {
      const history: UserHistoryRecord[] = [{
        userId: 'user1',
        platform: 'zhihu',
        profiles: {
          'tech': { category: 'tech', profileData: {}, timestamp: 0, context: '', model: '' }
        },
        lastUpdated: 0
      }];
      storageMock.get.mockResolvedValue({ deep_profile_history: history });

      await HistoryService.deleteProfile('user1', 'zhihu', 'tech');

      const callArg = storageMock.set.mock.calls[0][0];
      const updatedHistory = callArg.deep_profile_history;
      expect(updatedHistory).toHaveLength(0);
    });
  });

  describe('deleteUserRecord', () => {
    it('should delete entire user record', async () => {
      const history: UserHistoryRecord[] = [
        { userId: 'user1', platform: 'zhihu', profiles: {}, lastUpdated: 0 },
        { userId: 'user2', platform: 'zhihu', profiles: {}, lastUpdated: 0 }
      ];
      storageMock.get.mockResolvedValue({ deep_profile_history: history });

      await HistoryService.deleteUserRecord('user1', 'zhihu');

      const callArg = storageMock.set.mock.calls[0][0];
      const updatedHistory = callArg.deep_profile_history;
      expect(updatedHistory).toHaveLength(1);
      expect(updatedHistory[0].userId).toBe('user2');
    });
  });

  describe('clearAll', () => {
    it('should clear all history', async () => {
      await HistoryService.clearAll();
      expect(storageMock.remove).toHaveBeenCalledWith('deep_profile_history');
    });
  });
});
