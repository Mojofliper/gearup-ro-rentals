import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { FeaturedGear } from '@/components/FeaturedGear';
import { HowItWorks } from '@/components/HowItWorks';
import { Footer } from '@/components/Footer';
import { BrowseGear } from '@/components/BrowseGear';
import { GearDetail } from '@/components/GearDetail';
import { Dashboard } from '@/components/Dashboard';
import { AddGear } from '@/components/AddGear';
import { EditGear } from '@/components/EditGear';
import { Messages } from '@/components/Messages';
import { LoadingScreen } from '@/components/LoadingScreen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import NotFound from "./pages/NotFound";
import { PaymentSuccess } from './pages/PaymentSuccess';
import { PaymentCancel } from './pages/PaymentCancel';
import { AdminDashboard } from '@/components/AdminDashboard';
import { MyListings } from '@/components/MyListings';
import { ReviewsPage } from '@/components/ReviewsPage';
import { BookingsPage } from '@/components/BookingsPage';

// Industry-standard QueryClient configuration with auth error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global retry configuration
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        
        // Don't retry on auth errors (401, 403)
        if (error && typeof error === 'object' && 'message' in error) {
          const message = (error as { message: string }).message;
          if (message.includes('401') || message.includes('403') || message.includes('Unauthorized')) {
            return false;
          }
        }
        
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      
      // Exponential backoff for retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Stale time - data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      
      // Cache time - keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      
      // Refetch on window focus (but not on reconnect to avoid infinite loops)
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations on network errors
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        
        // Retry up to 2 times for network errors
        return failureCount < 2;
      },
    },
  },
});

const HomePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <FeaturedGear />
      <HowItWorks />
      <Footer />
    </div>
  );
};

const AppRoutes = () => {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/browse" element={<BrowseGear />} />
      <Route path="/gear/:id" element={<GearDetail />} />
      <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
      <Route path="/my-listings" element={user ? <MyListings /> : <Navigate to="/" />} />
      <Route path="/edit-gear/:id" element={user ? <EditGear /> : <Navigate to="/" />} />
      <Route path="/reviews" element={user ? <ReviewsPage /> : <Navigate to="/" />} />
      <Route path="/add-gear" element={user ? <AddGear /> : <Navigate to="/" />} />
      <Route path="/messages" element={user ? <Messages /> : <Navigate to="/" />} />
      <Route path="/bookings" element={user ? <BookingsPage /> : <Navigate to="/" />} />
      <Route path="/admin/*" element={user && profile?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-cancel" element={<PaymentCancel />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppRoutes />
              <Toaster />
              <Sonner />
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
