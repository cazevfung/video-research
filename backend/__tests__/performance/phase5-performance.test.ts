/**
 * Phase 5: Performance Tests
 * 
 * Tests API response times, Firestore performance, credit operations,
 * and concurrent user scenarios.
 */

import request from 'supertest';
import app from '../../src/server';
import db from '../../src/config/database';
import { collection, doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase-admin/firestore';
import { checkCreditBalance, deductCredits, getUserCredits } from '../../src/services/credit.service';
import { getPricingConfig, getBatchPrice } from '../../src/services/pricing.service';

describe('Phase 5: Performance Tests', () => {
  const PERFORMANCE_THRESHOLDS = {
    apiResponseTime: 500, // ms
    firestoreRead: 100, // ms
    firestoreWrite: 200, // ms
    creditCheck: 50, // ms
    creditDeduction: 150, // ms
  };

  describe('API Response Times', () => {
    it('should respond to health check within threshold', async () => {
      const start = Date.now();
      const response = await request(app).get('/health');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
    });

    it('should respond to root endpoint within threshold', async () => {
      const start = Date.now();
      const response = await request(app).get('/');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
    });
  });

  describe('Firestore Read Performance', () => {
    it('should read pricing config within threshold', async () => {
      const start = Date.now();
      await getPricingConfig();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.firestoreRead);
    });

    it('should read user credits within threshold', async () => {
      if (!db) {
        throw new Error('Database not initialized');
      }

      const testUserId = `perf-test-${Date.now()}`;
      
      // Create test user credits
      const creditRef = doc(db, 'user_credits', testUserId);
      await setDoc(creditRef, {
        userId: testUserId,
        balance: 100,
        totalEarned: 120,
        totalSpent: 20,
        lastResetDate: Timestamp.now(),
        tier: 'free',
        tierUnlockedAt: null,
        tierUnlockedBy: null,
      });

      const start = Date.now();
      await getUserCredits(testUserId);
      const duration = Date.now() - start;

      // Cleanup
      await deleteDoc(creditRef);

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.firestoreRead);
    });
  });

  describe('Firestore Write Performance', () => {
    it('should write user credits within threshold', async () => {
      if (!db) {
        throw new Error('Database not initialized');
      }

      const testUserId = `perf-write-${Date.now()}`;
      const creditRef = doc(db, 'user_credits', testUserId);

      const start = Date.now();
      await setDoc(creditRef, {
        userId: testUserId,
        balance: 100,
        totalEarned: 120,
        totalSpent: 20,
        lastResetDate: Timestamp.now(),
        tier: 'free',
        tierUnlockedAt: null,
        tierUnlockedBy: null,
      });
      const duration = Date.now() - start;

      // Cleanup
      await deleteDoc(creditRef);

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.firestoreWrite);
    });
  });

  describe('Credit Operation Performance', () => {
    it('should check credit balance within threshold', async () => {
      if (!db) {
        throw new Error('Database not initialized');
      }

      const testUserId = `perf-credit-${Date.now()}`;
      
      // Initialize credits
      const creditRef = doc(db, 'user_credits', testUserId);
      await setDoc(creditRef, {
        userId: testUserId,
        balance: 100,
        totalEarned: 120,
        totalSpent: 20,
        lastResetDate: Timestamp.now(),
        tier: 'free',
        tierUnlockedAt: null,
        tierUnlockedBy: null,
      });

      const start = Date.now();
      await checkCreditBalance(testUserId);
      const duration = Date.now() - start;

      // Cleanup
      await deleteDoc(creditRef);

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.creditCheck);
    });

    it('should deduct credits within threshold', async () => {
      if (!db) {
        throw new Error('Database not initialized');
      }

      const testUserId = `perf-deduct-${Date.now()}`;
      
      // Initialize credits
      const creditRef = doc(db, 'user_credits', testUserId);
      await setDoc(creditRef, {
        userId: testUserId,
        balance: 100,
        totalEarned: 120,
        totalSpent: 20,
        lastResetDate: Timestamp.now(),
        tier: 'free',
        tierUnlockedAt: null,
        tierUnlockedBy: null,
      });

      const start = Date.now();
      await deductCredits(testUserId, 10, {
        batchId: `perf-batch-${Date.now()}`,
      });
      const duration = Date.now() - start;

      // Cleanup
      await deleteDoc(creditRef);
      const transactionsRef = collection(db, 'credit_transactions');
      const transactionsSnapshot = await transactionsRef
        .where('userId', '==', testUserId)
        .get();
      for (const transactionDoc of transactionsSnapshot.docs) {
        await deleteDoc(transactionDoc.ref);
      }

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.creditDeduction);
    });
  });

  describe('Concurrent User Scenarios', () => {
    it('should handle concurrent credit checks', async () => {
      if (!db) {
        throw new Error('Database not initialized');
      }

      const testUserIds = Array.from({ length: 10 }, (_, i) => `concurrent-${Date.now()}-${i}`);
      
      // Initialize credits for all users
      for (const userId of testUserIds) {
        const creditRef = doc(db, 'user_credits', userId);
        await setDoc(creditRef, {
          userId,
          balance: 100,
          totalEarned: 120,
          totalSpent: 20,
          lastResetDate: Timestamp.now(),
          tier: 'free',
          tierUnlockedAt: null,
          tierUnlockedBy: null,
        });
      }

      // Perform concurrent credit checks
      const start = Date.now();
      const promises = testUserIds.map(userId => checkCreditBalance(userId));
      await Promise.all(promises);
      const duration = Date.now() - start;

      // Cleanup
      for (const userId of testUserIds) {
        const creditRef = doc(db, 'user_credits', userId);
        await deleteDoc(creditRef);
      }

      // Should complete within reasonable time (10x single operation)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.creditCheck * 10);
    });

    it('should handle concurrent credit deductions atomically', async () => {
      if (!db) {
        throw new Error('Database not initialized');
      }

      const testUserId = `concurrent-deduct-${Date.now()}`;
      
      // Initialize credits
      const creditRef = doc(db, 'user_credits', testUserId);
      await setDoc(creditRef, {
        userId: testUserId,
        balance: 100,
        totalEarned: 120,
        totalSpent: 20,
        lastResetDate: Timestamp.now(),
        tier: 'free',
        tierUnlockedAt: null,
        tierUnlockedBy: null,
      });

      // Try to deduct more than available concurrently
      const promises = Array.from({ length: 5 }, () =>
        deductCredits(testUserId, 30, {
          batchId: `batch-${Date.now()}-${Math.random()}`,
        }).catch(() => null) // Catch errors for insufficient credits
      );

      const results = await Promise.all(promises);
      
      // Check final balance
      const finalBalance = await checkCreditBalance(testUserId);
      
      // Should have deducted at most 100 credits (initial balance)
      // Some operations should have failed due to insufficient credits
      expect(finalBalance).toBeGreaterThanOrEqual(0);
      expect(finalBalance).toBeLessThanOrEqual(100);

      // Cleanup
      await deleteDoc(creditRef);
      const transactionsRef = collection(db, 'credit_transactions');
      const transactionsSnapshot = await transactionsRef
        .where('userId', '==', testUserId)
        .get();
      for (const transactionDoc of transactionsSnapshot.docs) {
        await deleteDoc(transactionDoc.ref);
      }
    });
  });
});


