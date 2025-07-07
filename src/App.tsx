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
import { Messages } from '@/components/Messages';
import { LoadingScreen } from '@/components/LoadingScreen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import NotFound from "./pages/NotFound";
import { PaymentSuccess } from './pages/PaymentSuccess';
import { PaymentCancel } from './pages/PaymentCancel';
import { AdminDashboard } from '@/components/AdminDashboard';

const queryClient = new QueryClient();

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
  const { user, loading } = useAuth();
  
  // console.log('AppRoutes: Rendering with state:', { user: !!user, loading, userId: user?.id });
  
  if (loading) {
    console.log('AppRoutes: Showing loading screen');
    return <LoadingScreen />;
  }
  
  console.log('AppRoutes: Loading complete, rendering routes');
  
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/browse" element={<BrowseGear />} />
      <Route path="/gear/:id" element={<GearDetail />} />
      <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
      <Route path="/add-gear" element={user ? <AddGear /> : <Navigate to="/" />} />
      <Route path="/messages" element={user ? <Messages /> : <Navigate to="/" />} />
      <Route path="/admin/*" element={user && user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-cancel" element={<PaymentCancel />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  console.log('App: Rendering main App component');
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
