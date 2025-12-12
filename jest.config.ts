import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    // Transform ESM modules (remark, etc.)
    'node_modules/(?!(remark|remark-html|remark-parse|unified|bail|is-plain-obj|trough|vfile|vfile-message|unist-util-stringify-position|mdast-util-to-hast|unist-builder|unist-util-position|mdast-util-definitions|micromark|micromark-util-combine-extensions|micromark-util-symbol|micromark-util-encode|micromark-util-decode-numeric-character-reference|micromark-util-decode-string|micromark-util-sanitize-uri|micromark-util-normalize-identifier|micromark-util-html-tag-name|micromark-factory-space|micromark-util-character|micromark-factory-label|micromark-factory-title|micromark-factory-whitespace|micromark-util-classify-character|micromark-util-chunked|micromark-util-resolve-all|micromark-core-commonmark|micromark-util-subtokenize|mdast-util-from-markdown|mdast-util-to-string|zwitch|hast-util-sanitize|hast-util-to-html|hast-util-whitespace|property-information|space-separated-tokens|comma-separated-tokens|html-void-elements|web-namespaces|ccount|escape-string-regexp|markdown-table|trim-lines)/)',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
