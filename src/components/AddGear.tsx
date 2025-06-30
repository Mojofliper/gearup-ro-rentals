
import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { GearForm } from './AddGear/GearForm';
import { AddGearHeader } from './AddGear/AddGearHeader';

export const AddGear: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Acces restricționat</h2>
            <p className="text-gray-600">Trebuie să fii conectat pentru a adăuga echipament.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <AddGearHeader />
        <GearForm />
      </div>

      <Footer />
    </div>
  );
};
