import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test-setup.ts'],
    alias: [
      { find: '~locales', replacement: resolve(__dirname, './__mocks__/locale-mock') },
      { find: '~locales/zh-CN', replacement: resolve(__dirname, './__mocks__/locale-mock') },
      { find: '~locales/en-US', replacement: resolve(__dirname, './__mocks__/locale-mock') },
      { find: '~locales/index', replacement: resolve(__dirname, './__mocks__/locale-mock') },
      { find: '~services/LabelUtils', replacement: resolve(__dirname, './__mocks__/label-utils-mock') },
      { find: '~services/I18nService', replacement: resolve(__dirname, './__mocks__/services/I18nService') },
      { find: '~services/TopicService', replacement: resolve(__dirname, './__mocks__/topic-service-mock') },
      { find: '~components/MarkdownRenderer', replacement: resolve(__dirname, './__mocks__/markdown-renderer-mock') },
      { find: /^data-text:.*locales\/zh-CN.*$/, replacement: resolve(__dirname, './__mocks__/zh-CN-changelog-mock') },
      { find: /^data-text:.*locales\/en-US.*$/, replacement: resolve(__dirname, './__mocks__/en-US-changelog-mock') },
      { find: /^data-text:.*/, replacement: resolve(__dirname, './__mocks__/data-text-mock') },
      { find: /^~(.+)$/, replacement: `${resolve(__dirname, './src')}/$1` },
    ],
    mockReset: true,
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 70,
        functions: 65,
        branches: 60,
        statements: 70
      }
    }
  },
  resolve: {
    alias: [
      { find: '~locales', replacement: resolve(__dirname, './__mocks__/locale-mock') },
      { find: '~locales/zh-CN', replacement: resolve(__dirname, './__mocks__/locale-mock') },
      { find: '~locales/en-US', replacement: resolve(__dirname, './__mocks__/locale-mock') },
      { find: '~locales/index', replacement: resolve(__dirname, './__mocks__/locale-mock') },
      { find: '~services/LabelUtils', replacement: resolve(__dirname, './__mocks__/label-utils-mock') },
      { find: '~services/I18nService', replacement: resolve(__dirname, './__mocks__/services/I18nService') },
      { find: '~services/TopicService', replacement: resolve(__dirname, './__mocks__/topic-service-mock') },
      { find: '~components/MarkdownRenderer', replacement: resolve(__dirname, './__mocks__/markdown-renderer-mock') },
      { find: /^data-text:.*locales\/zh-CN.*$/, replacement: resolve(__dirname, './__mocks__/zh-CN-changelog-mock') },
      { find: /^data-text:.*locales\/en-US.*$/, replacement: resolve(__dirname, './__mocks__/en-US-changelog-mock') },
      { find: /^data-text:.*/, replacement: resolve(__dirname, './__mocks__/data-text-mock') },
      { find: /^~(.+)$/, replacement: `${resolve(__dirname, './src')}/$1` },
    ],
  },
});
