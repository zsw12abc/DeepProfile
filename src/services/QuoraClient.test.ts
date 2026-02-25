import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuoraClient, type QuoraContent } from './QuoraClient';
import type { ZhihuContent } from './ZhihuClient';

describe('QuoraClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('fetchUserProfile', () => {
        it('should return a basic user profile layout when given a username', async () => {
            const username = 'testuser';
            const result = await QuoraClient.fetchUserProfile(username);

            expect(result).not.toBeNull();
            expect(result?.name).toBe('testuser');
            expect(result?.headline).toBe('Quora user @testuser');
            expect(result?.url_token).toBe('testuser');
        });
    });

    describe('fetchDetailContent', () => {
        it('should return null (current API limitation)', async () => {
            const resultAnswer = await QuoraClient.fetchDetailContent('12345', 'answer');
            const resultQuestion = await QuoraClient.fetchDetailContent('12345', 'question');

            expect(resultAnswer).toBeNull();
            expect(resultQuestion).toBeNull();
        });
    });

    describe('fetchUserContent', () => {
        it('should handle failed content script communication gracefully', async () => {
            const result = await QuoraClient.fetchUserContent('testuser');

            expect(result).toEqual({
                items: [],
                totalFetched: 0,
                totalRelevant: 0,
            });
        });

        it('should fetch content through chrome API when available', async () => {
            const mockContent = [
                { id: '1', title: 'Test Answer', content: 'Hello World', created_time: 123456, url: '', type: 'answer' } as ZhihuContent
            ];

            global.chrome = {
                tabs: {
                    query: vi.fn((queryInfo, callback) => callback([{ id: 100 }])),
                    sendMessage: vi.fn().mockResolvedValue(true),
                },
                runtime: {
                    onMessage: {
                        addListener: vi.fn((callback) => {
                            setTimeout(() => {
                                callback({
                                    type: 'QUORA_CONTENT_RESPONSE',
                                    requestId: expect.any(String),
                                });
                            }, 10);
                        }),
                        removeListener: vi.fn(),
                    }
                }
            } as any;

            const fetchSpy = vi.spyOn(QuoraClient as any, 'fetchContentFromTab').mockResolvedValue(mockContent);

            const result = await QuoraClient.fetchUserContent('testuser', 15, 'test context');

            expect(fetchSpy).toHaveBeenCalledWith('testuser', 15, 'https://www.quora.com/profile/testuser/answers');
            expect(result.items).toEqual(mockContent);
            expect(result.totalFetched).toBe(1);
        });

        it('should catch errors thrown during fetch', async () => {
            const fetchSpy = vi.spyOn(QuoraClient as any, 'fetchContentFromTab').mockRejectedValue(new Error('Network error'));

            const result = await QuoraClient.fetchUserContent('testuser');

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
                { id: '1', title: 'I like apples', excerpt: 'Apple is good', content: 'Very good', created_time: 10000000000, url: '', type: 'answer', action_type: 'created' } as ZhihuContent,
                { id: '2', title: 'I like bananas', excerpt: 'Banana is good', content: 'Very good', created_time: 10000000000, url: '', type: 'answer', action_type: 'created' } as ZhihuContent,
            ];

            const sortByRelevance = (QuoraClient as any).sortByRelevance;
            const sorted = sortByRelevance(items, 'apple');

            expect(sorted[0].id).toBe('1');
            expect(sorted[0].is_relevant).toBe(true);
            expect(sorted[1].id).toBe('2');
            expect(sorted[1].is_relevant).toBe(false);
        });
    });

    describe('convertToZhihuContent (private method)', () => {
        it('should properly convert QuoraContent answer to ZhihuContent', () => {
            const quoraItem: QuoraContent = {
                id: '123',
                title: 'Title',
                excerpt: 'Excerpt',
                content: 'Content',
                created_time: 123456,
                url: 'https://quora.com',
                type: 'answer'
            };

            const convert = (QuoraClient as any).convertToZhihuContent;
            const result = convert(quoraItem);

            expect(result.type).toBe('answer');
            expect(result.id).toBe('123');
            expect(result.title).toBe('Title');
        });

        it('should properly convert QuoraContent post/question to ZhihuContent article', () => {
            const quoraItem: QuoraContent = {
                id: '123',
                title: 'Title',
                excerpt: 'Excerpt',
                content: 'Content',
                created_time: 123456,
                url: 'https://quora.com',
                type: 'post'
            };

            const convert = (QuoraClient as any).convertToZhihuContent;
            const result = convert(quoraItem);

            expect(result.type).toBe('article');
        });
    });

    describe('fetchContentFromTab (chrome API simulation)', () => {
        it('should handle no active tab', async () => {
            global.chrome = {
                tabs: {
                    query: vi.fn((queryInfo, callback) => callback([])),
                },
            } as any;

            const result = await (QuoraClient as any).fetchContentFromTab('testuser', 10, 'url');
            expect(result).toEqual([]);
        });

        it('should handle Chrome API not available', async () => {
            global.chrome = undefined as any;
            const result = await (QuoraClient as any).fetchContentFromTab('testuser', 10, 'url');
            expect(result).toEqual([]);
        });

        it('should resolve with content when message connects successfully', async () => {
            let listenerCallback: Function;
            global.chrome = {
                tabs: {
                    query: vi.fn((queryInfo, callback) => callback([{ id: 100 }])),
                    sendMessage: vi.fn().mockResolvedValue(true),
                },
                runtime: {
                    onMessage: {
                        addListener: vi.fn((callback) => listenerCallback = callback),
                        removeListener: vi.fn(),
                    }
                }
            } as any;

            const fetchPromise = (QuoraClient as any).fetchContentFromTab('testuser', 10, 'url');

            await new Promise(resolve => setTimeout(resolve, 0));

            const sendMessageCall = (global.chrome.tabs.sendMessage as any).mock.calls[0];
            const requestId = sendMessageCall[1].requestId;

            listenerCallback!({
                type: 'QUORA_CONTENT_RESPONSE',
                requestId: requestId,
                content: [{ id: 'fake_answer' }]
            });

            const result = await fetchPromise;
            expect(result).toEqual([{ id: 'fake_answer' }]);
        });

        it('should resolve with empty array if sendMessage fails', async () => {
            global.chrome = {
                tabs: {
                    query: vi.fn((queryInfo, callback) => callback([{ id: 100 }])),
                    sendMessage: vi.fn().mockRejectedValue(new Error('Connection failed')),
                },
                runtime: {
                    onMessage: {
                        addListener: vi.fn(),
                        removeListener: vi.fn(),
                    }
                }
            } as any;

            const result = await (QuoraClient as any).fetchContentFromTab('testuser', 10, 'url');
            expect(result).toEqual([]);
        });
    });
});
