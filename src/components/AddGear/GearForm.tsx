import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Camera, Info, ImagePlus, CheckCircle2 } from 'lucide-react';
import { BasicInfo } from './BasicInfo';
import { PhotoUpload } from './PhotoUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateGear } from '@/hooks/useGear';
import { toast } from '@/hooks/use-toast';
import { validateGearName, validateGearDescription, validatePrice, sanitizeInput } from '@/utils/validation';

interface GearFormData {
  name: string;
  description: string;
  categoryId: string;
  brand: string;
  model: string;
  condition: string;
  pricePerDay: string;
  depositAmount: string;
  pickupLocation: string;
  specifications: string[];
  includedItems: string[];
}

export const GearForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createGear = useCreateGear();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<GearFormData>({
    name: '',
    description: '',
    categoryId: '',
    brand: '',
    model: '',
    condition: '',
    pricePerDay: '',
    depositAmount: '',
    pickupLocation: '',
    specifications: [],
    includedItems: [],
  });
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const updateFormData = (updates: Partial<GearFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear validation errors for updated fields
    const updatedKeys = Object.keys(updates);
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      updatedKeys.forEach(key => delete newErrors[key]);
      return newErrors;
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const nameError = validateGearName(formData.name);
    if (nameError) errors.name = nameError;
    const descError = validateGearDescription(formData.description);
    if (descError) errors.description = descError;
    const priceError = validatePrice(formData.pricePerDay);
    if (priceError) errors.pricePerDay = priceError;
    if (!formData.categoryId) errors.categoryId = 'Categoria este obligatorie';
    if (!formData.condition) errors.condition = 'Starea este obligatorie';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateForm()) {
        toast({
          title: 'Informații incomplete sau invalide',
          description: 'Te rugăm să corectezi erorile din formular.',
          variant: 'destructive',
        });
        return;
      }
    }
    setCurrentStep(2);
  };

  const handleBack = () => {
    if (currentStep === 1) {
      navigate(-1);
    } else {
      setCurrentStep(1);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: 'Informații invalide',
        description: 'Te rugăm să corectezi erorile din formular.',
        variant: 'destructive',
      });
      return;
    }
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
        title: sanitizeInput(formData.name),
        description: formData.description ? sanitizeInput(formData.description) : null,
        category_id: formData.categoryId,
        price_per_day: Math.round(parseFloat(formData.pricePerDay)),
        deposit_amount: formData.depositAmount ? Math.round(parseFloat(formData.depositAmount)) : 0,
        pickup_location: formData.pickupLocation ? sanitizeInput(formData.pickupLocation) : 'Romania',
        brand: formData.brand ? sanitizeInput(formData.brand) : null,
        model: formData.model ? sanitizeInput(formData.model) : null,
        condition: formData.condition || 'Bună',
        specifications: formData.specifications.length > 0 ? formData.specifications : [],
        included_items: formData.includedItems.length > 0 ? formData.includedItems : [],
        is_available: true,
      };
      const result = await createGear.mutateAsync(gearData);
      if (!result) throw new Error('Failed to create gear: No result returned from API');
      if (images.length > 0 && result.id) {
        const photos = images.map((img, idx) => ({ photo_url: img, is_primary: idx === 0 }));
        const apiService = await import('@/services/apiService');
        await apiService.api.gear.uploadGearPhotos(result.id, photos);
      }
      setShowSuccess(true);
      setTimeout(() => {
        navigate(`/gear/${result.id}`);
      }, 1800);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Eroare',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stepper UI
  const Stepper = () => (
    <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm py-3 mb-6 rounded-xl shadow-sm flex items-center justify-center gap-6 sm:gap-10">
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 flex items-center justify-center rounded-full border-2 ${currentStep === 1 ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-400'} font-bold text-lg transition-all`}>
          <Info className="h-5 w-5" />
        </div>
        <span className={`mt-1 text-xs font-medium ${currentStep === 1 ? 'text-blue-700' : 'text-gray-400'}`}>Detalii</span>
      </div>
      <div className={`h-1 w-10 sm:w-16 rounded-full ${currentStep === 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 flex items-center justify-center rounded-full border-2 ${currentStep === 2 ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-400'} font-bold text-lg transition-all`}>
          <Camera className="h-5 w-5" />
        </div>
        <span className={`mt-1 text-xs font-medium ${currentStep === 2 ? 'text-blue-700' : 'text-gray-400'}`}>Fotografii</span>
      </div>
    </div>
  );

  // Success animation
  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] py-12 animate-fade-in">
        <CheckCircle2 className="h-16 w-16 text-green-500 mb-4 animate-bounce-in" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Echipament adăugat cu succes!</h2>
        <p className="text-gray-600 mb-4">Redirecționare către pagina echipamentului...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full bg-white/90 rounded-2xl shadow-xl p-2 sm:p-6 md:p-8">
      {/* Back Button inside form card */}
      <div className="mb-2 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-gray-700 hover:text-blue-700"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Înapoi</span>
        </Button>
      </div>
      <Stepper />
      {/* Step content */}
      <div className="space-y-8">
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" /> Detalii echipament
            </h3>
            <BasicInfo 
              formData={formData} 
              updateFormData={updateFormData}
              validationErrors={validationErrors}
            />
          </div>
        )}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-blue-600" /> Fotografii echipament
            </h3>
            <PhotoUpload images={images} setImages={setImages} />
          </div>
        )}
      </div>
      {/* Navigation buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-2 mt-8 sticky bottom-0 bg-white/80 py-3 rounded-xl z-10">
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
          <Button onClick={handleNext} className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <span>Continuă</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white flex items-center space-x-2"
          >
            {isSubmitting ? 'Se publică...' : 'Publică echipamentul'}
          </Button>
        )}
      </div>
    </div>
  );
};
