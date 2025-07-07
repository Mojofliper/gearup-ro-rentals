import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useRateLimit } from '@/hooks/useRateLimit';

interface RateLimitFeedbackProps {
  action: string;
  endpoint: string;
  onRetry?: () => void;
  showProgress?: boolean;
}

export const RateLimitFeedback: React.FC<RateLimitFeedbackProps> = ({
  action,
  endpoint,
  onRetry,
  showProgress = true
}) => {
  const { getRateLimitStatus, resetRateLimit } = useRateLimit();
  const [rateLimitStatus, setRateLimitStatus] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    const checkRateLimit = async () => {
      try {
        const status = await getRateLimitStatus(endpoint);
        setRateLimitStatus(status);
        
        if (status.isLimited) {
          setTimeRemaining(status.resetTime - Date.now());
        }
      } catch (error) {
        console.error('Error checking rate limit status:', error);
      }
    };

    checkRateLimit();
    const interval = setInterval(checkRateLimit, 5000); // Check every 5 seconds instead of 1

    return () => clearInterval(interval);
  }, [endpoint, getRateLimitStatus]);

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [timeRemaining]);

  const formatTimeRemaining = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getProgressPercentage = () => {
    if (!rateLimitStatus || !rateLimitStatus.isLimited) return 0;
    const total = rateLimitStatus.resetTime - rateLimitStatus.windowStart;
    const elapsed = Date.now() - rateLimitStatus.windowStart;
    return Math.min(100, (elapsed / total) * 100);
  };

  const handleRetry = async () => {
    if (onRetry) {
      onRetry();
    }
  };

  const handleReset = async () => {
    await resetRateLimit(endpoint);
    const status = await getRateLimitStatus(endpoint);
    setRateLimitStatus(status);
  };

  if (!rateLimitStatus) {
    return null;
  }

  if (rateLimitStatus.isLimited) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle>Limită de rate atinsă</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            Ai atins limita de {action.toLowerCase()}. Te rugăm să aștepți înainte de a încerca din nou.
          </p>
          
          {showProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Timp rămas:</span>
                <span className="font-medium">{formatTimeRemaining(timeRemaining)}</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-orange-700">
            <Clock className="h-4 w-4" />
            <span>
              {rateLimitStatus.remaining} din {rateLimitStatus.limit} încercări rămase
            </span>
          </div>

          <div className="flex gap-2">
            {onRetry && timeRemaining === 0 && (
              <Button size="sm" onClick={handleRetry}>
                Încearcă din nou
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleReset}>
              Resetare limită
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (rateLimitStatus.remaining <= 2) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle>Atenție - Limită aproape atinsă</AlertTitle>
        <AlertDescription>
          <p>
            Ai aproape atins limita de {action.toLowerCase()}. 
            Mai ai {rateLimitStatus.remaining} încercări rămase.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-green-200 bg-green-50">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertTitle>Limită OK</AlertTitle>
      <AlertDescription>
        <p>
          Mai ai {rateLimitStatus.remaining} din {rateLimitStatus.limit} încercări disponibile.
        </p>
      </AlertDescription>
    </Alert>
  );
};

// Hook for rate limit status
export const useRateLimitStatus = (endpoint: string) => {
  const { getRateLimitStatus } = useRateLimit();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const rateLimitStatus = await getRateLimitStatus(endpoint);
        setStatus(rateLimitStatus);
      } catch (error) {
        console.error('Error checking rate limit status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds instead of 5

    return () => clearInterval(interval);
  }, [endpoint, getRateLimitStatus]);

  return { status, loading };
};

// Component for showing rate limit status in headers/navigation
export const RateLimitStatus: React.FC<{ endpoint: string }> = ({ endpoint }) => {
  const { status, loading } = useRateLimitStatus(endpoint);

  if (loading || !status) {
    return null;
  }

  const getStatusColor = () => {
    if (status.isLimited) return 'text-red-600';
    if (status.remaining <= 2) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (status.isLimited) return <XCircle className="h-3 w-3" />;
    if (status.remaining <= 2) return <AlertTriangle className="h-3 w-3" />;
    return <CheckCircle className="h-3 w-3" />;
  };

  return (
    <div className={`flex items-center gap-1 text-xs ${getStatusColor()}`}>
      {getStatusIcon()}
      <span>{status.remaining}/{status.limit}</span>
    </div>
  );
}; 