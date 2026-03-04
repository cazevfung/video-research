/**
 * Jest setup file
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AUTH_ENABLED = 'false';
process.env.PORT = '5001'; // Different port for tests
process.env.SUPADATA_API_KEY = 'test-api-key';
process.env.DASHSCOPE_BEIJING_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-secret';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Suppress console logs during tests (optional - can be removed for debugging)
// Uncomment the following lines if you want to suppress logs
// const originalConsoleLog = console.log;
// console.log = () => {};

