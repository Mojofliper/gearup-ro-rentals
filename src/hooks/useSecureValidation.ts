
import { useState } from 'react';
import { validateGearName, validateGearDescription, validatePrice, validateImageFile, sanitizeInput } from '@/utils/validation';

interface ValidationErrors {
  [key: string]: string;
}

export const useSecureValidation = () => {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateField = (name: string, value: any): string | null => {
    switch (name) {
      case 'name':
        return validateGearName(value);
      case 'description':
        return validateGearDescription(value);
      case 'pricePerDay':
        return validatePrice(value);
      case 'image':
        return validateImageFile(value);
      default:
        return null;
    }
  };

  const validateForm = (formData: Record<string, any>, requiredFields: string[]): boolean => {
    const newErrors: ValidationErrors = {};

    // Check required fields
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].toString().trim().length === 0) {
        newErrors[field] = 'Acest câmp este obligatoriu';
      }
    });

    // Validate specific fields
    Object.keys(formData).forEach(key => {
      if (formData[key]) {
        const error = validateField(key, formData[key]);
        if (error) {
          newErrors[key] = error;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sanitizeFormData = (formData: Record<string, any>): Record<string, any> => {
    const sanitized: Record<string, any> = {};
    
    Object.keys(formData).forEach(key => {
      if (typeof formData[key] === 'string') {
        sanitized[key] = sanitizeInput(formData[key]);
      } else {
        sanitized[key] = formData[key];
      }
    });

    return sanitized;
  };

  const clearErrors = () => {
    setErrors({});
  };

  const setFieldError = (field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  return {
    errors,
    validateForm,
    validateField,
    sanitizeFormData,
    clearErrors,
    setFieldError
  };
};
