import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { GearForm } from "./AddGear/GearForm";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AddGear: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Acces restricționat
            </h2>
            <p className="text-gray-600">
              Trebuie să fii conectat pentru a adăuga echipament.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-purple-50 flex flex-col">
      <Header />
      {/* Hero Section */}
      <div className="w-full bg-gradient-to-r from-blue-50 via-white to-purple-50 border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 py-8 sm:py-12 flex flex-col items-center text-center">
          <div className="flex items-center justify-center mb-4">
            <span className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white w-14 h-14 shadow-lg">
              <PlusCircle className="h-8 w-8" />
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Adaugă un echipament nou
          </h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-xl mx-auto mb-2">
            Completează detaliile și publică rapid echipamentul tău pentru
            închiriere. Procesul durează doar câteva minute!
          </p>
        </div>
      </div>
      {/* Stepper and Form */}
      <main className="flex-1 w-full">
        <div className="container mx-auto px-2 sm:px-4 py-6 sm:py-10 max-w-2xl md:max-w-3xl lg:max-w-4xl">
          <GearForm />
        </div>
      </main>
      <Footer />
    </div>
  );
};
