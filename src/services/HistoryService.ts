import type { UserHistoryRecord, CategoryProfile, SupportedPlatform } from "~types";

const STORAGE_KEY = "deep_profile_history";
const MAX_USERS = 200; // Keep history for last 200 users
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export class HistoryService {
  
  /**
   * Saves or updates a profile for a specific category within a user's record.
   */
  static async saveProfile(
    userId: string, 
    platform: SupportedPlatform, 
    category: string, 
    profileData: any,
    context: string,
    model: string
  ): Promise<void> {
    const history = await this.getAllUserRecords();
    
    // 1. Find existing user record
    let userRecordIndex = history.findIndex(r => r.userId === userId && r.platform === platform);
    let userRecord: UserHistoryRecord;

    if (userRecordIndex !== -1) {
      // Remove it from current position (to move to top later)
      userRecord = history.splice(userRecordIndex, 1)[0];
    } else {
      // Create new user record
      userRecord = {
        userId,
        platform,
        profiles: {},
        lastUpdated: 0
      };
    }

    // 2. Update the specific category profile
    userRecord.profiles[category] = {
      category,
      profileData,
      context,
      timestamp: Date.now(),
      model
    };
    userRecord.lastUpdated = Date.now();

    // 3. Add to top of history
    history.unshift(userRecord);

    // 4. Trim history if too many users
    if (history.length > MAX_USERS) {
      history.length = MAX_USERS;
    }
    
    await chrome.storage.local.set({ [STORAGE_KEY]: history });
  }

  /**
   * Retrieves a specific category profile for a user.
   */
  static async getProfile(userId: string, platform: SupportedPlatform, category: string): Promise<CategoryProfile | null> {
    const history = await this.getAllUserRecords();
    const userRecord = history.find(r => r.userId === userId && r.platform === platform);
    
    if (!userRecord || !userRecord.profiles[category]) {
      return null;
    }

    const profile = userRecord.profiles[category];

    // Check expiration
    if (Date.now() - profile.timestamp > CACHE_DURATION) {
      return null;
    }

    return profile;
  }

  /**
   * Retrieves the full history record for a user (all categories).
   */
  static async getUserRecord(userId: string, platform: SupportedPlatform): Promise<UserHistoryRecord | null> {
    const history = await this.getAllUserRecords();
    return history.find(r => r.userId === userId && r.platform === platform) || null;
  }

  /**
   * Gets all user records stored in history.
   */
  static async getAllUserRecords(): Promise<UserHistoryRecord[]> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as UserHistoryRecord[]) || [];
  }

  /**
   * Deletes a specific category profile for a user.
   * If it's the last profile, the user record is removed entirely.
   */
  static async deleteProfile(userId: string, platform: SupportedPlatform, category: string): Promise<void> {
    const history = await this.getAllUserRecords();
    const index = history.findIndex(r => r.userId === userId && r.platform === platform);
    
    if (index !== -1) {
      const userRecord = history[index];
      delete userRecord.profiles[category];
      
      // If no profiles left, remove the user record
      if (Object.keys(userRecord.profiles).length === 0) {
        history.splice(index, 1);
      } else {
        // Otherwise just update the array (it's a reference, but let's be safe)
        history[index] = userRecord;
      }
      
      await chrome.storage.local.set({ [STORAGE_KEY]: history });
    }
  }

  /**
   * Deletes an entire user record.
   */
  static async deleteUserRecord(userId: string, platform: SupportedPlatform): Promise<void> {
    const history = await this.getAllUserRecords();
    const filtered = history.filter(r => !(r.userId === userId && r.platform === platform));
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
  }

  /**
   * Clears all history.
   */
  static async clearAll(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEY);
  }
}
