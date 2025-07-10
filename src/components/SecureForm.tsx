import React, { useState } from "react";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import { useSecureValidation } from "@/hooks/useSecureValidation";
import { handleApiError } from "@/utils/secureApi";
import { toast } from "@/hooks/use-toast";

interface SecureFormProps {
  children: React.ReactNode;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  initialData?: Record<string, unknown>;
  requiredFields?: string[];
}

export const SecureForm: React.FC<SecureFormProps> = ({
  children,
  onSubmit,
  initialData = {},
  requiredFields = [],
}) => {
  const { requireAuth } = useSecureAuth();
  const { errors, validateForm, sanitizeFormData, clearErrors } =
    useSecureValidation();
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
      await onSubmit(sanitizedData);

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

  const updateFormData = (updates: Record<string, unknown>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  return (
    <form onSubmit={handleSubmit}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            formData,
            updateFormData,
            validationErrors: errors,
            isSubmitting,
          } as unknown);
        }
        return child;
      })}
    </form>
  );
};
