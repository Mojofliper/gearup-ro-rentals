import React, { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { logCSPError, isCSPFromExtensions, getCSPRecommendations } from '@/utils/cspHelper';

interface ErrorHandlerProps {
  error?: Error | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showCSPGuidance?: boolean;
}

export const ErrorHandler: React.FC<ErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss,
  showCSPGuidance = true
}) => {
  useEffect(() => {
    if (error && typeof error === 'string') {
      // Check if it's a CSP error
      if (error.includes('Content-Security-Policy') || error.includes('CSP')) {
        logCSPError(error);
      }
    }
  }, [error]);

  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;
  const isCSPError = errorMessage.includes('Content-Security-Policy') || errorMessage.includes('CSP');
  const isDatabaseError = errorMessage.includes('column') || errorMessage.includes('42703');
  const isExtensionError = isCSPError && isCSPFromExtensions(errorMessage);

  const getErrorTitle = () => {
    if (isCSPError) return 'Content Security Policy Error';
    if (isDatabaseError) return 'Database Query Error';
    return 'An Error Occurred';
  };

  const getErrorDescription = () => {
    if (isCSPError && isExtensionError) {
      return 'This error is likely caused by a browser extension. Try disabling extensions or using incognito mode.';
    }
    
    if (isCSPError) {
      return 'A Content Security Policy error occurred. This may be due to external scripts or browser extensions.';
    }
    
    if (isDatabaseError) {
      return 'A database query error occurred. This has been automatically fixed in the latest update.';
    }
    
    return errorMessage;
  };

  const getRecommendations = () => {
    if (isCSPError) {
      return getCSPRecommendations(errorMessage);
    }
    
    if (isDatabaseError) {
      return [
        'The database schema has been updated to fix this issue.',
        'Try refreshing the page to load the latest changes.',
        'If the problem persists, contact support.'
      ];
    }
    
    return [];
  };

  const recommendations = getRecommendations();

  return (
    <Alert className="mb-4 border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertTitle className="text-red-800">{getErrorTitle()}</AlertTitle>
      <AlertDescription className="text-red-700">
        {getErrorDescription()}
      </AlertDescription>
      
      {recommendations.length > 0 && (
        <div className="mt-3">
          <h4 className="text-sm font-medium text-red-800 mb-2">Recommendations:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="mt-4 flex gap-2">
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
        
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-red-600 hover:bg-red-100"
          >
            <X className="h-4 w-4 mr-2" />
            Dismiss
          </Button>
        )}
        
        {isExtensionError && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://support.google.com/chrome/answer/2765944', '_blank')}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            Learn More
          </Button>
        )}
      </div>
    </Alert>
  );
}; 