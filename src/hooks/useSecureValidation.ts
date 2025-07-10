import { useState } from "react";
import {
  validateGearName,
  validateGearDescription,
  validatePrice,
  validateImageFile,
  sanitizeInput,
} from "@/utils/validation";

interface ValidationErrors {
  [key: string]: string;
}

export const useSecureValidation = () => {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateField = (name: string, value: unknown): string | null => {
    switch (name) {
      case "name":
        return validateGearName(value as string);
      case "description":
        return validateGearDescription(value as string);
      case "pricePerDay":
        return validatePrice(value as number);
      case "image":
        return validateImageFile(value as File);
      default:
        return null;
    }
  };

  const validateForm = (
    formData: Record<string, unknown>,
    requiredFields: string[],
  ): boolean => {
    const newErrors: ValidationErrors = {};

    // Check required fields
    requiredFields.forEach((field) => {
      if (!formData[field] || (formData[field] as string).trim().length === 0) {
        newErrors[field] = "Acest câmp este obligatoriu";
      }
    });

    // Validate specific fields
    Object.keys(formData).forEach((key) => {
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

  const sanitizeFormData = (
    formData: Record<string, unknown>,
  ): Record<string, unknown> => {
    const sanitized: Record<string, unknown> = {};

    Object.keys(formData).forEach((key) => {
      if (typeof formData[key] === "string") {
        sanitized[key] = sanitizeInput(formData[key] as string);
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
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  return {
    errors,
    validateForm,
    validateField,
    sanitizeFormData,
    clearErrors,
    setFieldError,
  };
};
