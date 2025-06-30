
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { BasicInfo } from './AddGear/BasicInfo';
import { PhotoUpload } from './AddGear/PhotoUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateGear } from '@/hooks/useGear';
import { toast } from '@/hooks/use-toast';

export const AddGear: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createGear = useCreateGear();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    brand: '',
    model: '',
    condition: '',
    pricePerDay: '',
    depositAmount: '',
    pickupLocation: '',
    specifications: [] as string[],
    includedItems: [] as string[],
  });
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate basic info
      if (!formData.name || !formData.categoryId || !formData.condition || !formData.pricePerDay) {
        toast({
          title: 'Informații incomplete',
          description: 'Te rugăm să completezi toate câmpurile obligatorii.',
          variant: 'destructive',
        });
        return;
      }
    }
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      toast({
        title: 'Fotografii lipsă',
        description: 'Te rugăm să adaugi cel puțin o fotografie.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Eroare de autentificare',
        description: 'Trebuie să fii conectat pentru a adăuga echipament.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const gearData = {
        owner_id: user.id,
        name: formData.name,
        description: formData.description || null,
        category_id: formData.categoryId || null,
        brand: formData.brand || null,
        model: formData.model || null,
        condition: formData.condition,
        price_per_day: Math.round(parseFloat(formData.pricePerDay) * 100), // Convert to cents
        deposit_amount: formData.depositAmount ? Math.round(parseFloat(formData.depositAmount) * 100) : 0,
        pickup_location: formData.pickupLocation || null,
        specifications: formData.specifications,
        included_items: formData.includedItems,
        images: images,
        is_available: true,
      };

      const result = await createGear.mutateAsync(gearData);
      
      toast({
        title: 'Echipament adăugat cu succes!',
        description: 'Echipamentul tău a fost publicat și este acum disponibil pentru închiriere.',
      });

      navigate(`/gear/${result.id}`);
    } catch (error) {
      console.error('Error creating gear:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut adăuga echipamentul. Te rugăm să încerci din nou.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Adaugă echipament
            </h1>
            <p className="text-xl text-gray-600">
              Publică echipamentul tău și câștigă bani din închiriere
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-purple-600' : 'bg-gray-200'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
            </div>
          </div>

          {/* Step content */}
          {currentStep === 1 && (
            <BasicInfo formData={formData} updateFormData={updateFormData} />
          )}

          {currentStep === 2 && (
            <PhotoUpload images={images} setImages={setImages} />
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Înapoi</span>
            </Button>

            {currentStep === 1 ? (
              <Button onClick={handleNext} className="flex items-center space-x-2">
                <span>Continuă</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isSubmitting ? 'Se publică...' : 'Publică echipamentul'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};
