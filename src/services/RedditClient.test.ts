import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedditClient } from './RedditClient';

describe('RedditClient', () => {
  const fetchMock = vi.fn();
  global.fetch = fetchMock;

  beforeEach(() => {
    fetchMock.mockClear();
    vi.clearAllMocks();
  });

  describe('fetchUserProfile', () => {
    it('should fetch user profile successfully', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            name: 'testuser',
            comment_karma: 100,
            subreddit: { public_description: 'Test description' }
          }
        })
      });

      const profile = await RedditClient.fetchUserProfile('testuser');
      expect(profile).toEqual({
        name: 'testuser',
        headline: 'Test description',
        url_token: 'testuser'
      });
    });

    it('should return null on error', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));
      const profile = await RedditClient.fetchUserProfile('testuser');
      expect(profile).toBeNull();
    });
  });

  describe('fetchUserContent', () => {
    it('should fetch user content successfully', async () => {
      // Mock posts response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            children: [{
              data: {
                id: 'post1',
                title: 'Test Post',
                selftext: 'Post content',
                created_utc: 1234567890,
                permalink: '/r/test/post1',
                subreddit: 'test'
              }
            }]
          }
        })
      });

      // Mock comments response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            children: [{
              data: {
                id: 'comment1',
                body: 'Comment content',
                link_title: 'Link Title',
                created_utc: 1234567890,
                permalink: '/r/test/comment1',
                subreddit: 'test'
              }
            }]
          }
        })
      });

      const result = await RedditClient.fetchUserContent('testuser');
      
      expect(result.items).toHaveLength(2);
      expect(result.totalFetched).toBe(2);
      
      // Check post conversion
      const post = result.items.find(i => i.id === 'post1');
      expect(post?.title).toBe('Test Post');
      expect(post?.content).toBe('Post content');
      
      // Check comment conversion
      const comment = result.items.find(i => i.id === 'comment1');
      expect(comment?.title).toBe('Link Title');
      expect(comment?.content).toBe('Comment content');
    });

    it('should handle fetch errors gracefully', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));
      
      const result = await RedditClient.fetchUserContent('testuser');
      
      expect(result.items).toHaveLength(0);
      expect(result.totalFetched).toBe(0);
    });
  });

  describe('fetchDetailContent', () => {
    it('should fetch post detail content', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ([
          {
            data: {
              children: [{
                data: {
                  selftext: 'Detailed content'
                }
              }]
            }
          }
        ])
      });

      const content = await RedditClient.fetchDetailContent('post1', 'post');
      expect(content).toBe('Detailed content');
    });

    it('should return null for comments (not implemented)', async () => {
      const content = await RedditClient.fetchDetailContent('comment1', 'comment');
      expect(content).toBeNull();
    });
  });
});
