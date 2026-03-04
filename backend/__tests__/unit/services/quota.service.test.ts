/**
 * Unit tests for quota service
 */
import {
  checkQuota,
  deductCredit,
  getQuotaInfo,
  validateBatchSize,
} from '../../../src/services/quota.service';
import { getUserById, updateUser } from '../../../src/models/User';
import env from '../../../src/config/env';

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockGetUserById = getUserById as jest.MockedFunction<typeof getUserById>;
const mockUpdateUser = updateUser as jest.MockedFunction<typeof updateUser>;

describe('quota.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset auth enabled state
    env.AUTH_ENABLED = false;
  });

  describe('checkQuota', () => {
    it('should return true when auth is disabled', async () => {
      env.AUTH_ENABLED = false;
      const result = await checkQuota('test-user-id');
      expect(result).toBe(true);
      expect(mockGetUserById).not.toHaveBeenCalled();
    });

    it('should check user quota when auth is enabled', async () => {
      env.AUTH_ENABLED = true;
      mockGetUserById.mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        credits_remaining: 5,
        created_at: new Date(),
      });

      const result = await checkQuota('test-user-id');
      expect(result).toBe(true);
      expect(mockGetUserById).toHaveBeenCalledWith('test-user-id');
    });

    it('should return false when user has no credits', async () => {
      env.AUTH_ENABLED = true;
      mockGetUserById.mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        credits_remaining: 0,
        created_at: new Date(),
      });

      const result = await checkQuota('test-user-id');
      expect(result).toBe(false);
    });
  });

  describe('deductCredit', () => {
    it('should do nothing when auth is disabled', async () => {
      env.AUTH_ENABLED = false;
      await deductCredit('test-user-id');
      expect(mockGetUserById).not.toHaveBeenCalled();
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('should deduct credit when auth is enabled', async () => {
      env.AUTH_ENABLED = true;
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        credits_remaining: 5,
        created_at: new Date(),
      };
      mockGetUserById.mockResolvedValue(mockUser);
      mockUpdateUser.mockResolvedValue();

      await deductCredit('test-user-id');

      expect(mockGetUserById).toHaveBeenCalledWith('test-user-id');
      expect(mockUpdateUser).toHaveBeenCalledWith('test-user-id', {
        credits_remaining: 4,
      });
    });
  });

  describe('getQuotaInfo', () => {
    it('should return unlimited quota when auth is disabled', async () => {
      env.AUTH_ENABLED = false;
      const quotaInfo = await getQuotaInfo('test-user-id');

      expect(quotaInfo.credits_remaining).toBeGreaterThan(100);
      expect(quotaInfo.tier).toBe('premium');
      expect(mockGetUserById).not.toHaveBeenCalled();
    });

    it('should return user quota info when auth is enabled', async () => {
      env.AUTH_ENABLED = true;
      mockGetUserById.mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        credits_remaining: 3,
        created_at: new Date(),
      });

      const quotaInfo = await getQuotaInfo('test-user-id');

      expect(quotaInfo.credits_remaining).toBe(3);
      expect(quotaInfo.tier).toBe('free');
      expect(quotaInfo.daily_limit).toBe(3);
      expect(quotaInfo.max_videos_per_batch).toBe(3);
    });
  });

  describe('validateBatchSize', () => {
    it('should allow any batch size when auth is disabled', async () => {
      env.AUTH_ENABLED = false;
      const result = await validateBatchSize('test-user-id', 10);
      expect(result.valid).toBe(true);
    });

    it('should validate batch size against tier limits', async () => {
      env.AUTH_ENABLED = true;
      mockGetUserById.mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        credits_remaining: 3,
        created_at: new Date(),
      });

      // Free tier max is 3
      const validResult = await validateBatchSize('test-user-id', 3);
      expect(validResult.valid).toBe(true);

      const invalidResult = await validateBatchSize('test-user-id', 4);
      expect(invalidResult.valid).toBe(false);
    });

    it('should allow larger batches for premium tier', async () => {
      env.AUTH_ENABLED = true;
      mockGetUserById.mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'premium',
        credits_remaining: 50,
        created_at: new Date(),
      });

      // Premium tier max is 10
      const result = await validateBatchSize('test-user-id', 10);
      expect(result.valid).toBe(true);
    });
  });
});



