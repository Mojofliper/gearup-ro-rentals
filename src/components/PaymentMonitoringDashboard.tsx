import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Activity,
  Users,
  Calendar
} from 'lucide-react';
import { usePaymentTesting } from '@/hooks/usePaymentTesting';
import { useEscrowPayments } from '@/hooks/useEscrowPayments';
import { supabase } from '@/integrations/supabase/client';

interface PaymentMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalAmount: number;
  averageAmount: number;
  successRate: number;
  escrowTransactions: number;
  activeEscrowAmount: number;
}

interface SystemHealth {
  webhookStatus: 'healthy' | 'warning' | 'error';
  databaseStatus: 'healthy' | 'warning' | 'error';
  stripeStatus: 'healthy' | 'warning' | 'error';
  lastWebhookTime: string;
  lastDatabaseCheck: string;
}

export const PaymentMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { isRunning, testResults, runAllTests } = usePaymentTesting();
  const { connectedAccount } = useEscrowPayments();

  useEffect(() => {
    loadMetrics();
    checkSystemHealth();
  }, []);

  const loadMetrics = async () => {
    try {
      // Get transaction metrics
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*');

      if (txError) throw txError;

      // Get escrow transactions
      const { data: escrowTransactions, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('*');

      if (escrowError) throw escrowError;

      // Calculate metrics
      const totalTransactions = transactions?.length || 0;
      const successfulTransactions = transactions?.filter(t => t.status === 'completed').length || 0;
      const failedTransactions = transactions?.filter(t => t.status === 'failed').length || 0;
      const pendingTransactions = transactions?.filter(t => t.status === 'pending').length || 0;
      
      const totalAmount = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
      const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;

      const escrowCount = escrowTransactions?.length || 0;
      const activeEscrowAmount = escrowTransactions
        ?.filter(e => e.escrow_status === 'held')
        .reduce((sum, e) => sum + e.rental_amount + e.deposit_amount, 0) || 0;

      setMetrics({
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        pendingTransactions,
        totalAmount,
        averageAmount,
        successRate,
        escrowTransactions: escrowCount,
        activeEscrowAmount
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkSystemHealth = async () => {
    try {
      // Check webhook endpoints
      const webhookResponse = await fetch('https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/stripe-webhook', {
        method: 'OPTIONS'
      });

      // Check database connection
      const { data: dbTest, error: dbError } = await supabase
        .from('transactions')
        .select('count')
        .limit(1);

      // Check Stripe connection (simplified)
      const stripeStatus = connectedAccount ? 'healthy' : 'warning';

      setSystemHealth({
        webhookStatus: webhookResponse.ok ? 'healthy' : 'error',
        databaseStatus: dbError ? 'error' : 'healthy',
        stripeStatus,
        lastWebhookTime: new Date().toISOString(),
        lastDatabaseCheck: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking system health:', error);
      setSystemHealth({
        webhookStatus: 'error',
        databaseStatus: 'error',
        stripeStatus: 'error',
        lastWebhookTime: new Date().toISOString(),
        lastDatabaseCheck: new Date().toISOString()
      });
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await Promise.all([loadMetrics(), checkSystemHealth()]);
    setLastUpdated(new Date());
  };

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading payment metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time payment system monitoring and analytics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={runAllTests} disabled={isRunning} variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Run Tests
          </Button>
        </div>
      </div>

      {/* System Health */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              System Health
            </CardTitle>
            <CardDescription>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  {getStatusIcon(systemHealth.webhookStatus)}
                  <span className="ml-2">Webhooks</span>
                </div>
                <Badge className={getStatusColor(systemHealth.webhookStatus)}>
                  {systemHealth.webhookStatus}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  {getStatusIcon(systemHealth.databaseStatus)}
                  <span className="ml-2">Database</span>
                </div>
                <Badge className={getStatusColor(systemHealth.databaseStatus)}>
                  {systemHealth.databaseStatus}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  {getStatusIcon(systemHealth.stripeStatus)}
                  <span className="ml-2">Stripe</span>
                </div>
                <Badge className={getStatusColor(systemHealth.stripeStatus)}>
                  {systemHealth.stripeStatus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalTransactions}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.successfulTransactions} successful
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</div>
              <Progress value={metrics.successRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(metrics.totalAmount / 100).toFixed(2)} RON
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: {(metrics.averageAmount / 100).toFixed(2)} RON
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Escrow Active</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.escrowTransactions}</div>
              <p className="text-xs text-muted-foreground">
                {(metrics.activeEscrowAmount / 100).toFixed(2)} RON held
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction Status Breakdown */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span>Successful</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{metrics.successfulTransactions}</span>
                  <Badge variant="default">{((metrics.successfulTransactions / metrics.totalTransactions) * 100).toFixed(1)}%</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-yellow-600 mr-2" />
                  <span>Pending</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{metrics.pendingTransactions}</span>
                  <Badge variant="secondary">{((metrics.pendingTransactions / metrics.totalTransactions) * 100).toFixed(1)}%</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                  <span>Failed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{metrics.failedTransactions}</span>
                  <Badge variant="destructive">{((metrics.failedTransactions / metrics.totalTransactions) * 100).toFixed(1)}%</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment System Tests</CardTitle>
            <CardDescription>
              Automated test results for payment system components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((suite, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">{suite.name}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">{suite.passedTests} passed</Badge>
                      {suite.failedTests > 0 && (
                        <Badge variant="destructive">{suite.failedTests} failed</Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {suite.duration}ms
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {suite.tests.map((test, testIndex) => (
                      <div key={testIndex} className="flex items-center justify-between text-sm">
                        <span className="flex items-center">
                          {test.status === 'passed' ? (
                            <CheckCircle className="h-3 w-3 text-green-600 mr-2" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 text-red-600 mr-2" />
                          )}
                          {test.testName}
                        </span>
                        <span className="text-muted-foreground">
                          {test.duration}ms
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentMonitoringDashboard; 
