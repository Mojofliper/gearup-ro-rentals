
import React, { useState } from 'react';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { useSecureValidation } from '@/hooks/useSecureValidation';
import { secureApiCall, handleApiError } from '@/utils/secureApi';
import { toast } from '@/hooks/use-toast';

interface SecureFormProps {
  children: React.ReactNode;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  initialData?: Record<string, any>;
  requiredFields?: string[];
  rateLimit?: {
    action: string;
    maxActions?: number;
    windowMinutes?: number;
  };
}

export const SecureForm: React.FC<SecureFormProps> = ({
  children,
  onSubmit,
  initialData = {},
  requiredFields = [],
  rateLimit
}) => {
  const { requireAuth } = useSecureAuth();
  const { errors, validateForm, sanitizeFormData, clearErrors } = useSecureValidation();
  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      requireAuth();
      
      // Clear previous errors
      clearErrors();
      
      // Validate form
      if (!validateForm(formData, requiredFields)) {
        toast({
          title: "Eroare de validare",
          description: "Te rugăm să corectezi erorile din formular.",
          variant: "destructive",
        });
        return;
      }
      
      setIsSubmitting(true);
      
      // Sanitize and submit
      const sanitizedData = sanitizeFormData(formData);
      
      await secureApiCall(
        () => onSubmit(sanitizedData),
        {
          requireAuth: true,
          rateLimit
        }
      );
      
      toast({
        title: "Succes",
        description: "Datele au fost salvate cu succes.",
      });
      
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast({
        title: "Eroare",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (updates: Record<string, any>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return (
    <form onSubmit={handleSubmit}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            formData,
            updateFormData,
            validationErrors: errors,
            isSubmitting
          } as any);
        }
        return child;
      })}
    </form>
  );
};
