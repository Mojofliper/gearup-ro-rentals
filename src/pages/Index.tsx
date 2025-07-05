import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { FeaturedGear } from '@/components/FeaturedGear';
import { HowItWorks } from '@/components/HowItWorks';
import { Footer } from '@/components/Footer';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/browse', { replace: true });
    }
  }, [user, loading, navigate]);

  if (!loading && user) return null;

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

export default Index;
