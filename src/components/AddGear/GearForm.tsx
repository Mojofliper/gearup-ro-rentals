import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react';
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

    // Validate name
    const nameError = validateGearName(formData.name);
    if (nameError) errors.name = nameError;

    // Validate description
    const descError = validateGearDescription(formData.description);
    if (descError) errors.description = descError;

    // Validate price
    const priceError = validatePrice(formData.pricePerDay);
    if (priceError) errors.pricePerDay = priceError;

    // Required fields validation
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
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    // Final validation
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
        price_per_day: Math.round(parseFloat(formData.pricePerDay)), // Store as actual amount, not cents
        deposit_amount: formData.depositAmount ? Math.round(parseFloat(formData.depositAmount)) : 0, // Store as actual amount, not cents
        pickup_location: formData.pickupLocation ? sanitizeInput(formData.pickupLocation) : 'Romania',
        // Note: brand, model, condition, specifications, included_items, is_available are not in the original schema
        // They were added in the migration, so we'll keep them for now
        brand: formData.brand ? sanitizeInput(formData.brand) : null,
        model: formData.model ? sanitizeInput(formData.model) : null,
        condition: formData.condition || 'Bună',
        specifications: formData.specifications.length > 0 ? formData.specifications : [],
        included_items: formData.includedItems.length > 0 ? formData.includedItems : [],
        is_available: true,
      };

      console.log('Creating gear with data:', gearData);

      // 1. Create the gear item
      const result = await createGear.mutateAsync(gearData);
      
      console.log('Create gear result:', result);

      // Check if gear was created successfully
      if (!result) {
        throw new Error('Failed to create gear: No result returned from API');
      }

      // 2. Upload images to gear_photos table
      // Assume images are base64 data URLs, convert and upload
      // Use the API service method uploadGearPhotos
      if (images.length > 0 && result.id) {
        const photos = images.map((img, idx) => ({
          photo_url: img,
          is_primary: idx === 0
        }));
        // Dynamically import the API service to avoid circular deps
        const apiService = await import('@/services/apiService');
        await apiService.api.gear.uploadGearPhotos(result.id, photos);
      }
      
      toast({
        title: 'Echipament adăugat cu succes!',
        description: 'Echipamentul tău a fost publicat și este acum disponibil pentru închiriere.',
      });

      navigate(`/gear/${result.id}`);
    } catch (error: unknown) {
      console.error('Error creating gear:', error);
      
      // Get more specific error message
      let errorMessage = 'Nu am putut adăuga echipamentul. Te rugăm să încerci din nou.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: 'Eroare',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
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
        <BasicInfo 
          formData={formData} 
          updateFormData={updateFormData}
          validationErrors={validationErrors}
        />
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
  );
};
