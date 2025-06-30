
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { FeaturedGear } from '@/components/FeaturedGear';
import { HowItWorks } from '@/components/HowItWorks';
import { Footer } from '@/components/Footer';
import { BrowseGear } from '@/components/BrowseGear';
import { GearDetail } from '@/components/GearDetail';
import { Profile } from '@/components/Profile';
import { AddGear } from '@/components/AddGear';
import { Messages } from '@/components/Messages';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

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
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/browse" element={<BrowseGear />} />
      <Route path="/gear/:id" element={<GearDetail />} />
      <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
      <Route path="/add-gear" element={user ? <AddGear /> : <Navigate to="/" />} />
      <Route path="/messages" element={user ? <Messages /> : <Navigate to="/" />} />
    </Routes>
  );
};

const Index = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default Index;
