import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { reportError } from '@/utils/errorReporting';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Generate unique error ID
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({ error, errorInfo, errorId });

    // Send to error reporting service
    reportError(error, {
      errorId,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleGoBack = () => {
    window.history.back();
  };

  private handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    if (error) {
      // Send additional context to error reporting
      reportError(error, {
        errorId,
        componentStack: errorInfo?.componentStack,
        userAction: 'manual_report',
        url: window.location.href
      });
      
      alert(`Eroarea a fost raportată cu ID: ${errorId}\nMulțumim pentru feedback!`);
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl">A apărut o eroare</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                Ne pare rău, a apărut o eroare neașteptată. Echipa noastră a fost notificată și va rezolva problema cât mai curând.
              </p>
              
              {this.state.errorId && (
                <div className="text-xs text-gray-500 text-center">
                  ID Eroare: {this.state.errorId}
                </div>
              )}

              <div className="flex flex-col space-y-2">
                <Button onClick={this.handleReload} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reîncarcă Pagina
                </Button>
                
                <Button variant="outline" onClick={this.handleGoBack} className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Înapoi
                </Button>
                
                <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Pagina Principală
                </Button>
                
                <Button variant="outline" onClick={this.handleReportError} className="w-full">
                  Raportează Eroarea
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    Detalii Eroare (Development)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono overflow-auto">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                      </div>
                    )}
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const handleError = (error: Error, context?: string) => {
    console.error(`Error in ${context || 'component'}:`, error);
    
    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error reporting service
      console.error('Production error:', {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
      });
    }
  };

  return { handleError };
}; 
