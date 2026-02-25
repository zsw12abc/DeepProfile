import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZhihuClient, type ZhihuContent } from "./ZhihuClient";

// Mock I18nService
vi.mock("./I18nService", () => ({
  I18nService: {
    t: (key: string) => key,
    init: vi.fn(),
    setLanguage: vi.fn(),
    getLanguage: () => "zh-CN",
  },
}));

describe("ZhihuClient", () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    vi.restoreAllMocks();
  });

  describe("resolveUserToken", () => {
    it("should resolve token via API if it is a hash ID", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url_token: "resolved_token" }),
      });

      const token = await ZhihuClient.resolveUserToken(
        "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      ); // 32 chars
      expect(token).toBe("resolved_token");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/members/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4?"),
        expect.any(Object),
      );
    });

    it("should return original token if API resolution fails", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network Error"));

      const token = await ZhihuClient.resolveUserToken(
        "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      );
      expect(token).toBe("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");
    });

    it("should return original id if it is not a hash ID", async () => {
      const token = await ZhihuClient.resolveUserToken("regularusername");
      expect(token).toBe("regularusername");
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("fetchUserProfile", () => {
    it("should fetch user profile successfully", async () => {
      vi.spyOn(ZhihuClient, "resolveUserToken").mockResolvedValue("testuser");

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: "Test User",
          headline: "Headline",
          url_token: "testuser",
          avatar_url: "http://example.com/avatar_l.jpg",
        }),
      });

      const profile = await ZhihuClient.fetchUserProfile("testuser");

      expect(profile).toEqual({
        name: "Test User",
        headline: "Headline",
        url_token: "testuser",
        avatar_url: "http://example.com/avatar.jpg",
      });

      (ZhihuClient.resolveUserToken as any).mockRestore();
    });

    it("should handle missing avatar_url", async () => {
      vi.spyOn(ZhihuClient, "resolveUserToken").mockResolvedValue("testuser");

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: "Test User",
          headline: "Headline",
          url_token: "testuser",
        }),
      });

      const profile = await ZhihuClient.fetchUserProfile("testuser");

      expect(profile?.avatar_url).toBeUndefined();

      (ZhihuClient.resolveUserToken as any).mockRestore();
    });

    it("should throw error on 403 forbidden", async () => {
      vi.spyOn(ZhihuClient, "resolveUserToken").mockResolvedValue("testuser");

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      try {
        await ZhihuClient.fetchUserProfile("testuser");
        expect.unreachable("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toBe("error_zhihu_403"); // Because we mocked I18nService.t
      }

      (ZhihuClient.resolveUserToken as any).mockRestore();
    });

    it("should return null if not 403 and fetch fails but without throwing immediately in json parsing", async () => {
      vi.spyOn(ZhihuClient, "resolveUserToken").mockResolvedValue("testuser");

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const profile = await ZhihuClient.fetchUserProfile("testuser");
      expect(profile).toBeNull();

      (ZhihuClient.resolveUserToken as any).mockRestore();
    });

    it("should throw error on network failure", async () => {
      vi.spyOn(ZhihuClient, "resolveUserToken").mockResolvedValue("testuser");

      fetchMock.mockRejectedValue(new Error("Network error"));

      await expect(ZhihuClient.fetchUserProfile("testuser")).rejects.toThrow(
        "Network error",
      );

      (ZhihuClient.resolveUserToken as any).mockRestore();
    });
  });

  describe("fetchUserContent", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should fetch user content successfully and sort by created_time without context", async () => {
      vi.spyOn(ZhihuClient, "resolveUserToken").mockResolvedValue("testuser");

      // Answers
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: "1", type: "answer", excerpt: "A", created_time: 1000 },
          ],
        }),
      });

      // Articles
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: "2", type: "article", excerpt: "B", created_time: 2000 },
          ],
        }),
      });

      // Activities
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              verb: "MEMBER_VOTEUP_ANSWER",
              target: { id: "3", type: "answer", excerpt: "C" },
              created_time: 1500,
            },
          ],
        }),
      });

      vi.spyOn(ZhihuClient as any, "enhanceContent").mockImplementation(
        async (items) => items,
      );

      const result = await ZhihuClient.fetchUserContent("testuser", 5);

      expect(result.items).toHaveLength(3);
      expect(result.totalFetched).toBe(3);
      // Details are mocked without titles etc, but created_time sorting should work (descending)
      expect(result.items[0].id).toBe("2"); // 2000
      expect(result.items[1].id).toBe("3"); // 1500
      expect(result.items[2].id).toBe("1"); // 1000
    });

    it("should deduplicate content with same ID", async () => {
      vi.spyOn(ZhihuClient, "resolveUserToken").mockResolvedValue("testuser");

      // Answer 1
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: "1", type: "answer", created_time: 1000 }],
        }),
      });

      // Article 1
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: "2", type: "article", created_time: 2000 }],
        }),
      });

      // Activity targets Answer 1 (same id)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              verb: "MEMBER_VOTEUP_ANSWER",
              target: { id: "1", type: "answer" },
              created_time: 1500,
            }, // duplicated id 1
          ],
        }),
      });

      vi.spyOn(ZhihuClient as any, "enhanceContent").mockImplementation(
        async (items) => items,
      );

      const result = await ZhihuClient.fetchUserContent("testuser", 5);

      expect(result.items).toHaveLength(2); // Only 2 unique items
      expect(result.totalFetched).toBe(2);
    });

    it("should sort by relevance if context is provided", async () => {
      vi.spyOn(ZhihuClient, "resolveUserToken").mockResolvedValue("testuser");

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      }); // all empty initially

      // Override fetchList specifically for this test
      vi.spyOn(ZhihuClient as any, "fetchList").mockImplementation(
        async (token, type) => {
          if (type === "answers") {
            return [
              {
                id: "1",
                type: "answer",
                title: "Vue is great",
                excerpt: "Vue is a framework",
                created_time: 1,
                action_type: "created",
              },
              {
                id: "2",
                type: "answer",
                title: "React is awesome",
                excerpt: "React is a library",
                created_time: 2,
                action_type: "created",
              },
            ];
          }
          return [];
        },
      );
      vi.spyOn(ZhihuClient as any, "fetchActivities").mockImplementation(
        async () => [],
      );
      vi.spyOn(ZhihuClient as any, "enhanceContent").mockImplementation(
        async (items) => items,
      );

      const result = await ZhihuClient.fetchUserContent(
        "testuser",
        5,
        "Svelte|library",
      );

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe("2"); // React should be first
      expect(result.items[0].is_relevant).toBe(true);
      expect(result.items[1].is_relevant).toBe(false);
      expect(result.totalRelevant).toBe(1);
    });
  });

  describe("API partial failures", () => {
    it("should return empty arrays for failed internal fetches", async () => {
      vi.spyOn(ZhihuClient, "resolveUserToken").mockResolvedValue("testuser");

      // answer fetch network error
      fetchMock.mockRejectedValueOnce(new Error("Net Error"));
      // article fetch 404
      fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
      // activities 500
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

      vi.spyOn(ZhihuClient as any, "enhanceContent").mockImplementation(
        async (items) => items,
      );

      const result = await ZhihuClient.fetchUserContent("testuser");

      expect(result.items).toHaveLength(0);
      expect(result.totalFetched).toBe(0);

      (ZhihuClient.resolveUserToken as any).mockRestore();
    });
  });

  describe("fetchDetailContent", () => {
    it("should fetch detailed content for an answer", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: "<p>Detailed answer</p>" }),
      });

      const content = await ZhihuClient.fetchDetailContent("123", "answer");
      expect(content).toBe("<p>Detailed answer</p>");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/answers/123?include=content"),
        expect.any(Object),
      );
    });

    it("should fetch detailed content for an article", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: "<p>Detailed article</p>" }),
      });

      const content = await ZhihuClient.fetchDetailContent("456", "article");
      expect(content).toBe("<p>Detailed article</p>");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/articles/456?include=content"),
        expect.any(Object),
      );
    });

    it("should return null if detail fetch fails", async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
      const content = await ZhihuClient.fetchDetailContent("789", "answer");
      expect(content).toBeNull();
    });

    it("should return null on network error", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Fail"));
      const content = await ZhihuClient.fetchDetailContent("789", "answer");
      expect(content).toBeNull();
    });
  });

  describe("fetchAnswerContentForContext", () => {
    it("should call fetchDetailContent with answer type", async () => {
      const spy = vi
        .spyOn(ZhihuClient, "fetchDetailContent")
        .mockResolvedValue("Detail");
      const content = await ZhihuClient.fetchAnswerContentForContext("111");
      expect(spy).toHaveBeenCalledWith("111", "answer");
      expect(content).toBe("Detail");
    });
  });

  describe("fetchHotList", () => {
    it("should fetch hot list successfully", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              target: {
                title: "Hot Topic 1",
                excerpt: "Excerpt 1",
              },
            },
            {
              target: {
                question: { title: "Hot Question 2" },
                excerpt: "Excerpt 2",
              },
            },
          ],
        }),
      });

      const hotList = await ZhihuClient.fetchHotList();
      expect(hotList).toHaveLength(2);
      expect(hotList[0]).toBe("Title: Hot Topic 1\nExcerpt: Excerpt 1");
      expect(hotList[1]).toBe("Title: Hot Question 2\nExcerpt: Excerpt 2");
    });

    it("should handle fetch hot list failure", async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
      const hotList = await ZhihuClient.fetchHotList();
      expect(hotList).toEqual([]);
    });

    it("should handle network error", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Fail"));
      const hotList = await ZhihuClient.fetchHotList();
      expect(hotList).toEqual([]);
    });

    it("should handle empty data array", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      const hotList = await ZhihuClient.fetchHotList();
      expect(hotList).toEqual([]);
    });
  });

  describe("fetchImageAsBase64", () => {
    it("should fetch image and convert to base64", async () => {
      const mockBlob = new Blob(["mock image data"], { type: "image/png" });
      fetchMock.mockResolvedValueOnce({
        blob: async () => mockBlob,
      });

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: "data:image/png;base64,bW9jayBpbWFnZSBkYXRh",
        onloadend: null as any,
        onerror: null as any,
      };

      vi.stubGlobal(
        "FileReader",
        vi.fn().mockImplementation(() => {
          return mockFileReader;
        }),
      );

      const promise = ZhihuClient.fetchImageAsBase64("http://image.com/1.png");
      setTimeout(() => mockFileReader.onloadend(), 50); // Trigger load end manually

      const result = await promise;

      expect(fetchMock).toHaveBeenCalledWith("http://image.com/1.png");
      expect(result).toBe("data:image/png;base64,bW9jayBpbWFnZSBkYXRh");
    });

    it("should return null on fetch image error", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Net Error"));
      const result = await ZhihuClient.fetchImageAsBase64(
        "http://image.com/x.png",
      );
      expect(result).toBeNull();
    });

    it("should handle filereader error", async () => {
      const mockBlob = new Blob(["mock image data"], { type: "image/png" });
      fetchMock.mockResolvedValueOnce({
        blob: async () => mockBlob,
      });

      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onloadend: null as any,
        onerror: null as any,
      };

      vi.stubGlobal(
        "FileReader",
        vi.fn().mockImplementation(() => mockFileReader),
      );

      const promise = ZhihuClient.fetchImageAsBase64("http://image.com/1.png");
      setTimeout(() => mockFileReader.onerror(new Error("File read error")), 50); // Trigger error

      const result = await promise;
      expect(result).toBeNull();
    });

  });

  describe("cleanContentData", () => {
    it("should filter and format answers correctly", () => {
      const mockContent: ZhihuContent[] = [
        {
          id: "101",
          type: "answer",
          title: "如何评价 DeepSeek？",
          excerpt: "DeepSeek 是一家非常有潜力的 AI 公司...",
          content: "DeepSeek 是一家非常有潜力的 AI 公司...",
          created_time: 1234567890,
          url: "http://zhihu.com/answer/101",
          action_type: "created",
          is_relevant: true,
        },
        {
          id: "102",
          type: "answer",
          title: "Ignored Question",
          excerpt: "Ignored content",
          content: "", // Empty content
          created_time: 1234567890,
          url: "http://zhihu.com/answer/102",
          action_type: "voted",
          is_relevant: false,
        },
        {
          id: "103",
          type: "article",
          title: "AI 发展趋势",
          excerpt: "未来 AI 将<strong>改变世界</strong>。",
          content: "<p>未来 AI 将<strong>改变世界</strong>。</p>",
          created_time: 1234567890,
          url: "http://zhihu.com/article/103",
          action_type: "created",
          is_relevant: true,
        },
        {
          id: "104",
          type: "question",
          title: "Some activity",
          excerpt: "",
          content: "",
          created_time: 1234567890,
          action_type: "created",
          is_relevant: true,
        },
      ];

      const userProfile = {
        name: "TestUser",
        headline: "Tester",
        url_token: "test",
      };

      const result = ZhihuClient.cleanContentData(mockContent, userProfile);

      expect(result).toContain("User Nickname: TestUser");
      expect(result).toContain("【如何评价 DeepSeek？】");
      expect(result).toContain("DeepSeek 是一家非常有潜力的 AI 公司");
      expect(result).toContain("【Upvoted】");
      expect(result).toContain("[No Content]");
      expect(result).toContain("【AI 发展趋势】");
      expect(result).toContain("未来 AI 将改变世界"); // HTML stripped
      expect(result).toContain("【Activity】");
    });

    it("should handle empty data", () => {
      const result = ZhihuClient.cleanContentData([]);
      expect(result).toContain("no public answers or articles");
    });

    it("should trim non relevant items to 3 if relevant length >= 3", () => {
      const mockContent: ZhihuContent[] = [
        { id: "1", type: "answer", title: "1", excerpt: "", content: "", created_time: 0, action_type: "created", is_relevant: true },
        { id: "2", type: "answer", title: "2", excerpt: "", content: "", created_time: 0, action_type: "created", is_relevant: true },
        { id: "3", type: "answer", title: "3", excerpt: "", content: "", created_time: 0, action_type: "created", is_relevant: true },
        { id: "4", type: "answer", title: "4", excerpt: "", content: "", created_time: 0, action_type: "created", is_relevant: false },
        { id: "5", type: "answer", title: "5", excerpt: "", content: "", created_time: 0, action_type: "created", is_relevant: false },
        { id: "6", type: "answer", title: "6", excerpt: "", content: "", created_time: 0, action_type: "created", is_relevant: false },
        { id: "7", type: "answer", title: "7", excerpt: "", content: "", created_time: 0, action_type: "created", is_relevant: false },
      ];

      const result = ZhihuClient.cleanContentData(mockContent);

      expect(result).toContain("--- RELEVANT CONTENT");
      expect(result).toContain("[ID:1]");
      expect(result).toContain("[ID:2]");
      expect(result).toContain("[ID:3]");

      expect(result).toContain("--- OTHER RECENT CONTENT");
      expect(result).toContain("[ID:4]");
      expect(result).toContain("[ID:5]");
      expect(result).toContain("[ID:6]");
      expect(result).not.toContain("[ID:7]"); // Trimmed
    });
  });

  describe("enhanceContent", () => {
    it("should fetch details for items with empty content", async () => {
      const mockItems: ZhihuContent[] = [
        {
          id: "1",
          type: "answer",
          title: "Q1",
          excerpt: "short",
          content: "", // empty
          created_time: 1,
          action_type: "created",
        },
        {
          id: "2",
          type: "article",
          title: "A2",
          excerpt: "detailed setup",
          content: "detailed setup", // not empty
          created_time: 2,
          action_type: "created",
        },
      ];

      vi.spyOn(ZhihuClient, "fetchDetailContent").mockImplementation(
        async (id) => {
          if (id === "1") return "Fetched detailed content";
          return null;
        },
      );

      const result = await (ZhihuClient as any).enhanceContent(mockItems);

      expect(result[0].content).toBe("Fetched detailed content");
      expect(result[1].content).toBe("detailed setup");
      expect(ZhihuClient.fetchDetailContent).toHaveBeenCalledTimes(1);
      expect(ZhihuClient.fetchDetailContent).toHaveBeenCalledWith(
        "1",
        "answer",
      );
    });

    it("should handle error when fetching details in enhanceContent", async () => {
      const mockItems: ZhihuContent[] = [
        {
          id: "1",
          type: "answer",
          title: "Q1",
          excerpt: "short",
          content: "",
          created_time: 1,
          action_type: "created",
        },
      ];

      vi.spyOn(ZhihuClient, "fetchDetailContent").mockRejectedValueOnce(
        new Error("Net Error"),
      );

      const result = await (ZhihuClient as any).enhanceContent(mockItems);

      expect(result[0].content).toBe(""); // Remained unchanged
    });
  });
});
