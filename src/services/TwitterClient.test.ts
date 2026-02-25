import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TwitterClient } from './TwitterClient';
import type { ZhihuContent } from './ZhihuClient';

describe('TwitterClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('fetchUserProfile', () => {
        it('should return a basic user profile layout when given a username', async () => {
            const username = 'testuser';
            const result = await TwitterClient.fetchUserProfile(username);

            expect(result).not.toBeNull();
            expect(result?.name).toBe('testuser');
            expect(result?.headline).toBe('Twitter user @testuser');
            expect(result?.url_token).toBe('testuser');
        });
    });

    describe('fetchDetailContent', () => {
        it('should return null (current API limitation)', async () => {
            const resultTweet = await TwitterClient.fetchDetailContent('12345', 'tweet');
            const resultReply = await TwitterClient.fetchDetailContent('12345', 'reply');

            expect(resultTweet).toBeNull();
            expect(resultReply).toBeNull();
        });
    });

    describe('fetchUserContent', () => {
        it('should handle failed content script communication gracefully', async () => {
            // Mock chrome API entirely missing
            const result = await TwitterClient.fetchUserContent('testuser');

            expect(result).toEqual({
                items: [],
                totalFetched: 0,
                totalRelevant: 0,
            });
        });

        it('should fetch content through chrome API when available', async () => {
            // Mock Chrome API
            const mockContent = [
                { id: '1', title: 'Test Tweet', content: 'Hello World', created_time: 123456, url: '', type: 'tweet' } as ZhihuContent
            ];

            global.chrome = {
                tabs: {
                    query: vi.fn((queryInfo, callback) => {
                        callback([{ id: 100 }]); // Mock single active tab
                    }),
                    sendMessage: vi.fn().mockResolvedValue(true),
                },
                runtime: {
                    onMessage: {
                        addListener: vi.fn((callback) => {
                            // Trigger the callback asynchronously to simulate content script response
                            setTimeout(() => {
                                callback({
                                    type: 'TWITTER_CONTENT_RESPONSE',
                                    requestId: expect.any(String), // The callback needs the exact requestId generated inside fetchContentFromTab so we manually fake the response listener behavior differently below
                                });
                            }, 10);
                        }),
                        removeListener: vi.fn(),
                    }
                }
            } as any;

            // We need to slightly adjust how we mock this because requestId is generated inside.
            // Easiest is to mock the internal fetchContentFromTab or provide a working pseudo-chrome.

            // Let's spy on the private method directly
            const fetchSpy = vi.spyOn(TwitterClient as any, 'fetchContentFromTab').mockResolvedValue(mockContent);

            const result = await TwitterClient.fetchUserContent('testuser', 15, 'test context');

            expect(fetchSpy).toHaveBeenCalledWith('testuser', 15, 'https://twitter.com/testuser');
            expect(result.items).toEqual(mockContent);
            expect(result.totalFetched).toBe(1);

            // Since context is practically ignored inside fetchUserContent before hitting fetchContentFromTab the relevance doesn't sort in fetchUserContent
            // Let's also check if sort logic is hit.
            // Wait, let's look at fetchUserContent implementation:
            // It just returns { items: contentFromTab, ... }. It DOES NOT call sortByRelevance.
            // Let's test sortByRelevance separately if needed, though it's private.
        });

        it('should catch errors thrown during fetch', async () => {
            const fetchSpy = vi.spyOn(TwitterClient as any, 'fetchContentFromTab').mockRejectedValue(new Error('Network error'));

            const result = await TwitterClient.fetchUserContent('testuser');

            expect(result).toEqual({
                items: [],
                totalFetched: 0,
                totalRelevant: 0,
            });

            fetchSpy.mockRestore();
        });
    });

    describe('sortByRelevance (private method)', () => {
        it('should sort items based on relevance to context', () => {
            const items: ZhihuContent[] = [
                { id: '1', title: 'I like apples', excerpt: 'Apple is good', content: 'Very good', created_time: 10000000000, url: '', type: 'article', action_type: 'created' } as ZhihuContent,
                { id: '2', title: 'I like bananas', excerpt: 'Banana is good', content: 'Very good', created_time: 10000000000, url: '', type: 'article', action_type: 'created' } as ZhihuContent,
            ];

            const sortByRelevance = (TwitterClient as any).sortByRelevance;
            const sorted = sortByRelevance(items, 'apple');

            expect(sorted[0].id).toBe('1');
            expect(sorted[0].is_relevant).toBe(true);
            expect(sorted[1].id).toBe('2');
            expect(sorted[1].is_relevant).toBe(false);
        });

        it('should return original items if context is empty', () => {
            const items: ZhihuContent[] = [{ id: '1', title: 'Test' } as ZhihuContent];
            const sortByRelevance = (TwitterClient as any).sortByRelevance;
            const sorted = sortByRelevance(items, '');
            expect(sorted).toEqual(items);
        });
    });

    describe('convertToZhihuContent (private method)', () => {
        it('should properly convert TwitterPost to ZhihuContent', () => {
            const tweet = {
                id: '12345678',
                text: 'Hello from Twitter!',
                created_at: '2023-01-01T12:00:00Z',
                author_id: '111',
            };
            const user = {
                id: '111',
                username: 'testuser',
                name: 'Test User'
            };

            const convert = (TwitterClient as any).convertToZhihuContent;
            const result = convert(tweet, user);

            expect(result.id).toBe('12345678');
            expect(result.type).toBe('article');
            expect(result.title).toBe('Tweet from @testuser');
            expect(result.excerpt).toBe('Hello from Twitter!');
            expect(result.content).toBe('Hello from Twitter!');
            expect(result.url).toBe('https://twitter.com/testuser/status/12345678');
            expect(result.action_type).toBe('created');
        });
    });

    describe('fetchContentFromTab (chrome API simulation)', () => {
        it('should handle no active tab', async () => {
            global.chrome = {
                tabs: {
                    query: vi.fn((queryInfo, callback) => {
                        callback([]); // No active tab
                    }),
                },
            } as any;

            const result = await (TwitterClient as any).fetchContentFromTab('testuser', 10, 'url');
            expect(result).toEqual([]);
        });

        it('should handle Chrome API not available', async () => {
            global.chrome = undefined as any;
            const result = await (TwitterClient as any).fetchContentFromTab('testuser', 10, 'url');
            expect(result).toEqual([]);
        });

        it('should resolve with content when message connects successfully', async () => {
            // It's tricky to mock the responseCallback logic perfectly without extracting it,
            // but we can simulate the chrome runtime message listener behavior.

            let listenerCallback: Function;
            global.chrome = {
                tabs: {
                    query: vi.fn((queryInfo, callback) => {
                        callback([{ id: 100 }]);
                    }),
                    sendMessage: vi.fn().mockResolvedValue(true),
                },
                runtime: {
                    onMessage: {
                        addListener: vi.fn((callback) => {
                            listenerCallback = callback;
                        }),
                        removeListener: vi.fn(),
                    }
                }
            } as any;

            // Start the fetch promise
            const fetchPromise = (TwitterClient as any).fetchContentFromTab('testuser', 10, 'url');

            // Wait a microtask to let the query callback run and listener attach
            await new Promise(resolve => setTimeout(resolve, 0));

            // Find the generated requestId from the sendMessage arguments
            const sendMessageCall = (global.chrome.tabs.sendMessage as any).mock.calls[0];
            const sentMessage = sendMessageCall[1];
            const requestId = sentMessage.requestId;

            // Simulate content script sending the response back via the listener
            listenerCallback!({
                type: 'TWITTER_CONTENT_RESPONSE',
                requestId: requestId,
                content: [{ id: 'fake_tweet' }]
            });

            const result = await fetchPromise;
            expect(result).toEqual([{ id: 'fake_tweet' }]);
        });

        it('should resolve with empty array if sendMessage fails', async () => {
            global.chrome = {
                tabs: {
                    query: vi.fn((queryInfo, callback) => {
                        callback([{ id: 100 }]);
                    }),
                    sendMessage: vi.fn().mockRejectedValue(new Error('Connection failed')),
                },
                runtime: {
                    onMessage: {
                        addListener: vi.fn(),
                        removeListener: vi.fn(),
                    }
                }
            } as any;

            const result = await (TwitterClient as any).fetchContentFromTab('testuser', 10, 'url');
            expect(result).toEqual([]);
        });
    });
});
