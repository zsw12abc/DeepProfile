import type { HistoryRecord, SupportedPlatform } from "~types";

const STORAGE_KEY = "deep_profile_history";
const MAX_RECORDS = 500; // Increased limit since we now store per-context records
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export class HistoryService {
  
  // Save a record
  static async saveRecord(record: HistoryRecord): Promise<void> {
    const history = await this.getAllRecords();
    
    // Remove existing record for this user/platform AND CONTEXT to keep only the latest version of this specific analysis
    // We use strict equality for context. If context is undefined/null, it matches undefined/null.
    const filtered = history.filter(r => 
      !(r.userId === record.userId && 
        r.platform === record.platform && 
        r.context === record.context)
    );
    
    // Add new record at the beginning
    filtered.unshift(record);
    
    // Trim to max size
    const trimmed = filtered.slice(0, MAX_RECORDS);
    
    await chrome.storage.local.set({ [STORAGE_KEY]: trimmed });
  }

  // Get a record by userId, platform AND context
  static async getRecord(userId: string, platform: SupportedPlatform, context?: string): Promise<HistoryRecord | null> {
    const history = await this.getAllRecords();
    
    // Find a record that matches User, Platform AND Context
    const record = history.find(r => 
      r.userId === userId && 
      r.platform === platform && 
      r.context === context
    );
    
    if (!record) return null;

    // Check if expired
    if (Date.now() - record.timestamp > CACHE_DURATION) {
      return null; 
    }

    return record;
  }

  // Get all records
  static async getAllRecords(): Promise<HistoryRecord[]> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as HistoryRecord[]) || [];
  }

  // Delete a specific record
  static async deleteRecord(userId: string, platform: SupportedPlatform): Promise<void> {
    const history = await this.getAllRecords();
    // Delete all records for this user on this platform (regardless of context)
    // This is usually what users expect when clicking "delete" in the list
    const filtered = history.filter(r => !(r.userId === userId && r.platform === platform));
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
  }

  // Clear all history
  static async clearAll(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEY);
  }
}
