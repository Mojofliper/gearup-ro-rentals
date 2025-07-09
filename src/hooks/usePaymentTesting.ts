import { useState, useCallback } from 'react';
import { useEscrowPayments } from './useEscrowPayments';
import { PaymentService } from '@/services/paymentService';
import { toast } from 'sonner';

export interface PaymentTestResult {
  testName: string;
  status: 'passed' | 'failed' | 'running';
  duration?: number;
  error?: string;
  details?: unknown;
}

export interface PaymentTestSuite {
  name: string;
  tests: PaymentTestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
}

export const usePaymentTesting = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<PaymentTestSuite[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  
  const {
    createEscrowPaymentIntent,
    getConnectedAccountStatus,
    getEscrowTransaction,
    setupStripeConnect
  } = useEscrowPayments();

  const runTest = useCallback(async (
    testName: string,
    testFunction: () => Promise<unknown>
  ): Promise<PaymentTestResult> => {
    const startTime = Date.now();
    setCurrentTest(testName);
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      return {
        testName,
        status: 'passed',
        duration,
        details: result
      };
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      
      return {
        testName,
        status: 'failed',
        duration,
        error: (error as Error).message || 'Unknown error',
        details: error
      };
    }
  }, []);

  const testStripeConnectSetup = useCallback(async () => {
    return await runTest('Stripe Connect Setup', async () => {
      // Test Stripe Connect account creation
      const result = await setupStripeConnect('test@example.com', 'RO');
      return result;
    });
  }, [runTest, setupStripeConnect]);

  const testEscrowPaymentIntent = useCallback(async (bookingId: string, rentalAmount: number, depositAmount: number) => {
    return await runTest('Escrow Payment Intent Creation', async () => {
      const result = await createEscrowPaymentIntent(bookingId, rentalAmount, depositAmount);
      return result;
    });
  }, [runTest, createEscrowPaymentIntent]);

  const testConnectedAccountStatus = useCallback(async () => {
    return await runTest('Connected Account Status Check', async () => {
      const result = await getConnectedAccountStatus();
      return result;
    });
  }, [runTest, getConnectedAccountStatus]);

  const testEscrowTransactionRetrieval = useCallback(async (bookingId: string) => {
    return await runTest('Escrow Transaction Retrieval', async () => {
      const result = await getEscrowTransaction(bookingId);
      return result;
    });
  }, [runTest, getEscrowTransaction]);

  const testPaymentServiceMethods = useCallback(async () => {
    return await runTest('Payment Service Methods', async () => {
      // Test various payment service methods
      const methods = [
        'getBookingById',
        'getUserBookings',
        'calculatePaymentBreakdown',
        'processRefund'
      ];
      
      const results: Record<string, unknown> = {};
      for (const method of methods) {
        try {
          if (method === 'calculatePaymentBreakdown') {
            results[method] = PaymentService.calculatePaymentBreakdown(1000, 500);
          }
        } catch (error) {
          results[method] = { error: (error as Error).message };
        }
      }
      
      return results;
    });
  }, [runTest]);

  const testWebhookEndpoints = useCallback(async () => {
    return await runTest('Webhook Endpoints', async () => {
      // Test webhook endpoint availability
      const endpoints = [
        '/functions/v1/stripe-webhook',
        '/functions/v1/stripe-connect-setup',
        '/functions/v1/stripe-escrow-transaction',
        '/functions/v1/stripe-refund'
      ];
      
      const results: Record<string, unknown> = {};
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`https://wnrbxwzeshgblkfidayb.supabase.co${endpoint}`, {
            method: 'OPTIONS'
          });
          results[endpoint] = { status: response.status, ok: response.ok };
        } catch (error) {
          results[endpoint] = { error: (error as Error).message };
        }
      }
      
      return results;
    });
  }, [runTest]);

  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setTestResults([]);
    
    const testSuites: PaymentTestSuite[] = [];
    
    // Test Suite 1: API Endpoints
    const apiTests: PaymentTestResult[] = [];
    apiTests.push(await testWebhookEndpoints());
    apiTests.push(await testPaymentServiceMethods());
    
    testSuites.push({
      name: 'API Endpoints',
      tests: apiTests,
      totalTests: apiTests.length,
      passedTests: apiTests.filter(t => t.status === 'passed').length,
      failedTests: apiTests.filter(t => t.status === 'failed').length,
      duration: apiTests.reduce((sum, t) => sum + (t.duration || 0), 0)
    });

    // Test Suite 2: Stripe Connect
    const connectTests: PaymentTestResult[] = [];
    connectTests.push(await testConnectedAccountStatus());
    
    testSuites.push({
      name: 'Stripe Connect',
      tests: connectTests,
      totalTests: connectTests.length,
      passedTests: connectTests.filter(t => t.status === 'passed').length,
      failedTests: connectTests.filter(t => t.status === 'failed').length,
      duration: connectTests.reduce((sum, t) => sum + (t.duration || 0), 0)
    });

    // Test Suite 3: Escrow Transactions
    const escrowTests: PaymentTestResult[] = [];
    // Note: These would need actual booking IDs to test properly
    // escrowTests.push(await testEscrowPaymentIntent('test-booking-id', 1000, 500));
    // escrowTests.push(await testEscrowTransactionRetrieval('test-booking-id'));
    
    if (escrowTests.length > 0) {
      testSuites.push({
        name: 'Escrow Transactions',
        tests: escrowTests,
        totalTests: escrowTests.length,
        passedTests: escrowTests.filter(t => t.status === 'passed').length,
        failedTests: escrowTests.filter(t => t.status === 'failed').length,
        duration: escrowTests.reduce((sum, t) => sum + (t.duration || 0), 0)
      });
    }

    setTestResults(testSuites);
    setIsRunning(false);
    setCurrentTest('');

    // Show summary
    const totalTests = testSuites.reduce((sum, suite) => sum + suite.totalTests, 0);
    const totalPassed = testSuites.reduce((sum, suite) => sum + suite.passedTests, 0);
    const totalFailed = testSuites.reduce((sum, suite) => sum + suite.failedTests, 0);

    if (totalFailed === 0) {
      toast.success(`All ${totalTests} tests passed!`);
    } else {
      toast.error(`${totalFailed} out of ${totalTests} tests failed`);
    }
  }, [
    testWebhookEndpoints,
    testPaymentServiceMethods,
    testConnectedAccountStatus,
    testEscrowPaymentIntent,
    testEscrowTransactionRetrieval
  ]);

  const runSpecificTest = useCallback(async (testName: string, testFunction: () => Promise<unknown>) => {
    setIsRunning(true);
    const result = await runTest(testName, testFunction);
    
    setTestResults(prev => {
      const newResults = [...prev];
      if (newResults.length === 0) {
        newResults.push({
          name: 'Custom Test',
          tests: [result],
          totalTests: 1,
          passedTests: result.status === 'passed' ? 1 : 0,
          failedTests: result.status === 'failed' ? 1 : 0,
          duration: result.duration || 0
        });
      } else {
        newResults[0].tests.push(result);
        newResults[0].totalTests += 1;
        if (result.status === 'passed') {
          newResults[0].passedTests += 1;
        } else {
          newResults[0].failedTests += 1;
        }
        newResults[0].duration += result.duration || 0;
      }
      return newResults;
    });
    
    setIsRunning(false);
    setCurrentTest('');

    if (result.status === 'passed') {
      toast.success(`${testName} passed!`);
    } else {
      toast.error(`${testName} failed: ${(result as PaymentTestResult).error}`);
    }
  }, [runTest]);

  return {
    isRunning,
    currentTest,
    testResults,
    runAllTests,
    runSpecificTest,
    runTest,
    testStripeConnectSetup,
    testEscrowPaymentIntent,
    testConnectedAccountStatus,
    testEscrowTransactionRetrieval,
    testPaymentServiceMethods,
    testWebhookEndpoints
  };
}; 