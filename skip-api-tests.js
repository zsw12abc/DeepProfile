// Script to run tests excluding API-related tests
const { execSync } = require('child_process');

console.log('Running tests excluding API-related tests...');
try {
  // Run all tests except LLMService.test.ts which contains API tests
  const result = execSync('npx vitest run --reporter verbose --exclude "**/LLMService.test.{ts,tsx}"', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.error('Tests completed with some failures (expected for non-API tests)');
  process.exit(1); // Still exit with error code since some tests failed
}