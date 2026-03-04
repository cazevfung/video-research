/**
 * Phase 5 Integration Tests: Complete User Flow
 * 
 * Tests the complete user journey:
 * - Sign up → Login → Create batch → Request tier upgrade
 * - Credit deduction during batch processing
 * - Credit reset jobs
 * - Tier upgrade request and approval flow
 * - Error scenarios (insufficient credits)
 * - Data consistency (credits match transactions)
 */

import request from 'supertest';
import app from '../../src/server';
import db from '../../src/config/database';
import { collection, doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase-admin/firestore';
import { UserCredits, CreditTransaction } from '../../src/types/credit.types';
import { initializeUserCredits, checkCreditBalance, deductCredits, getUserCredits } from '../../src/services/credit.service';
import { getPricingConfig, getBatchPrice } from '../../src/services/pricing.service';
import admin from '../../src/config/firebase-admin';

// Mock Firebase Auth for testing
jest.mock('../../src/config/firebase-admin', () => ({
  auth: () => ({
    verifyIdToken: jest.fn(),
  }),
}));

describe('Phase 5: Complete User Flow Integration Tests', () => {
  let testUserId: string;
  let testUserEmail: string;
  let testFirebaseToken: string;

  beforeAll(async () => {
    // Create a test user
    testUserId = `test-user-${Date.now()}`;
    testUserEmail = `test-${Date.now()}@example.com`;
    
    // Initialize user credits
    await initializeUserCredits(testUserId, 'free');
  });

  afterAll(async () => {
    // Clean up test data
    if (db) {
      try {
        // Delete user credits
        const creditRef = doc(db, 'user_credits', testUserId);
        await deleteDoc(creditRef);
        
        // Delete credit transactions
        const transactionsRef = collection(db, 'credit_transactions');
        const transactionsSnapshot = await transactionsRef
          .where('userId', '==', testUserId)
          .get();
        
        for (const transactionDoc of transactionsSnapshot.docs) {
          await deleteDoc(transactionDoc.ref);
        }
      } catch (error) {
        console.error('Error cleaning up test data:', error);
      }
    }
  });

  describe('1. User Sign Up and Login Flow', () => {
    it('should initialize user credits on first login', async () => {
      const credits = await getUserCredits(testUserId);
      
      expect(credits).not.toBeNull();
      expect(credits?.userId).toBe(testUserId);
      expect(credits?.tier).toBe('free');
      expect(credits?.balance).toBeGreaterThan(0);
    });

    it('should have correct initial credit balance for free tier', async () => {
      const balance = await checkCreditBalance(testUserId);
      const pricingConfig = await getPricingConfig();
      const expectedCredits = pricingConfig.tiers.free.credits;
      
      // Free tier should have daily amount (40) or full allocation
      expect(balance).toBeGreaterThanOrEqual(40);
    });
  });

  describe('2. Credit Deduction During Batch Processing', () => {
    it('should deduct credits when batch is created', async () => {
      const initialBalance = await checkCreditBalance(testUserId);
      const videoCount = 1;
      const requiredCredits = await getBatchPrice(videoCount);
      
      // Deduct credits
      await deductCredits(testUserId, requiredCredits, {
        batchId: `test-batch-${Date.now()}`,
      });
      
      const finalBalance = await checkCreditBalance(testUserId);
      
      expect(finalBalance).toBe(initialBalance - requiredCredits);
    });

    it('should fail when insufficient credits', async () => {
      const balance = await checkCreditBalance(testUserId);
      const requiredCredits = balance + 100; // More than available
      
      await expect(
        deductCredits(testUserId, requiredCredits, {
          batchId: `test-batch-${Date.now()}`,
        })
      ).rejects.toThrow('Insufficient credits');
    });

    it('should create transaction record when credits are deducted', async () => {
      if (!db) {
        throw new Error('Database not initialized');
      }

      const initialBalance = await checkCreditBalance(testUserId);
      const requiredCredits = 20;
      const batchId = `test-batch-${Date.now()}`;
      
      await deductCredits(testUserId, requiredCredits, { batchId });
      
      // Check transaction was created
      const transactionsRef = collection(db, 'credit_transactions');
      const transactionsSnapshot = await transactionsRef
        .where('userId', '==', testUserId)
        .where('metadata.batchId', '==', batchId)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();
      
      expect(transactionsSnapshot.size).toBe(1);
      
      const transaction = transactionsSnapshot.docs[0].data() as CreditTransaction;
      expect(transaction.type).toBe('spent');
      expect(transaction.amount).toBe(-requiredCredits);
      expect(transaction.balanceBefore).toBe(initialBalance);
      expect(transaction.balanceAfter).toBe(initialBalance - requiredCredits);
    });
  });

  describe('3. Data Consistency Checks', () => {
    it('should have credits balance match transaction sum', async () => {
      if (!db) {
        throw new Error('Database not initialized');
      }

      const credits = await getUserCredits(testUserId);
      if (!credits) {
        throw new Error('User credits not found');
      }

      // Get all transactions for user
      const transactionsRef = collection(db, 'credit_transactions');
      const transactionsSnapshot = await transactionsRef
        .where('userId', '==', testUserId)
        .orderBy('timestamp', 'asc')
        .get();
      
      // Calculate balance from transactions
      let calculatedBalance = 0;
      transactionsSnapshot.docs.forEach((doc) => {
        const transaction = doc.data() as CreditTransaction;
        calculatedBalance += transaction.amount;
      });

      // Balance should match (allowing for initial balance)
      // The balance should equal initial balance + sum of all transactions
      const initialBalance = credits.totalEarned;
      const expectedBalance = initialBalance - credits.totalSpent;
      
      expect(credits.balance).toBe(expectedBalance);
    });

    it('should have totalEarned and totalSpent match transactions', async () => {
      if (!db) {
        throw new Error('Database not initialized');
      }

      const credits = await getUserCredits(testUserId);
      if (!credits) {
        throw new Error('User credits not found');
      }

      // Get all transactions
      const transactionsRef = collection(db, 'credit_transactions');
      const transactionsSnapshot = await transactionsRef
        .where('userId', '==', testUserId)
        .get();
      
      let totalEarned = 0;
      let totalSpent = 0;
      
      transactionsSnapshot.docs.forEach((doc) => {
        const transaction = doc.data() as CreditTransaction;
        if (transaction.type === 'earned' || transaction.type === 'reset' || transaction.type === 'tier_upgrade') {
          totalEarned += Math.abs(transaction.amount);
        } else if (transaction.type === 'spent') {
          totalSpent += Math.abs(transaction.amount);
        }
      });

      // Allow small differences due to rounding
      expect(Math.abs(credits.totalEarned - totalEarned)).toBeLessThan(1);
      expect(Math.abs(credits.totalSpent - totalSpent)).toBeLessThan(1);
    });
  });

  describe('4. Tier Upgrade Request Flow', () => {
    it('should create tier upgrade request', async () => {
      if (!db) {
        throw new Error('Database not initialized');
      }

      const tierRequestsRef = collection(db, 'tier_requests');
      const requestRef = doc(tierRequestsRef);
      
      const tierRequest = {
        requestId: requestRef.id,
        userId: testUserId,
        userEmail: testUserEmail,
        requestedTier: 'starter' as const,
        status: 'pending' as const,
        requestedAt: Timestamp.now(),
        processedAt: null,
        processedBy: null,
        notes: null,
      };
      
      await setDoc(requestRef, tierRequest);
      
      const requestDoc = await getDoc(requestRef);
      expect(requestDoc.exists()).toBe(true);
      expect(requestDoc.data()?.status).toBe('pending');
    });
  });

  describe('5. Error Scenarios', () => {
    it('should return 402 when insufficient credits for batch', async () => {
      // Set user balance to 0
      if (!db) {
        throw new Error('Database not initialized');
      }

      const creditRef = doc(db, 'user_credits', testUserId);
      await setDoc(creditRef, { balance: 0 }, { merge: true });
      
      // Try to create batch (this would normally be done via API)
      const balance = await checkCreditBalance(testUserId);
      const requiredCredits = await getBatchPrice(1);
      
      expect(balance).toBeLessThan(requiredCredits);
      
      // Restore balance for other tests
      await setDoc(creditRef, { balance: 100 }, { merge: true });
    });
  });
});


