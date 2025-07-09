import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, FileText, Camera, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface IdentityDocumentUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface DocumentUpload {
  type: 'identity_document' | 'identity_document_back' | 'address_document';
  file: File | null;
  preview: string | null;
  uploaded: boolean;
}

export const IdentityDocumentUpload: React.FC<IdentityDocumentUploadProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentUpload[]>([
    { type: 'identity_document', file: null, preview: null, uploaded: false },
    { type: 'identity_document_back', file: null, preview: null, uploaded: false },
    { type: 'address_document', file: null, preview: null, uploaded: false },
  ]);

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const getDocumentLabel = (type: string) => {
    switch (type) {
      case 'identity_document':
        return 'Document de identitate (față)';
      case 'identity_document_back':
        return 'Document de identitate (verso)';
      case 'address_document':
        return 'Document cu adresa (opțional)';
      default:
        return type;
    }
  };

  const getDocumentDescription = (type: string) => {
    switch (type) {
      case 'identity_document':
        return 'Încărcați fața documentului de identitate (CI, pașaport)';
      case 'identity_document_back':
        return 'Încărcați verso-ul documentului de identitate';
      case 'address_document':
        return 'Încărcați o factură sau document care confirmă adresa (opțional)';
      default:
        return '';
    }
  };

  const handleFileSelect = (index: number, file: File) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: 'Fișier prea mare',
        description: 'Fișierul nu poate depăși 10MB.',
        variant: 'destructive',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Tip de fișier invalid',
        description: 'Vă rugăm să încărcați doar imagini (JPG, PNG).',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const newDocuments = [...documents];
      newDocuments[index] = {
        ...newDocuments[index],
        file,
        preview: e.target?.result as string,
        uploaded: false,
      };
      setDocuments(newDocuments);
    };
    reader.readAsDataURL(file);
  };

  const uploadDocument = async (document: DocumentUpload): Promise<boolean> => {
    if (!document.file || !user?.id) return false;

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1]; // Remove data:image/...;base64, prefix
          resolve(base64);
        };
        reader.readAsDataURL(document.file!);
      });

      const response = await fetch('https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/stripe-upload-identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          documentType: document.type,
          documentData: base64,
          documentPurpose: 'identity_document',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload document');
      }

      return true;
    } catch (err: unknown) {
      console.error('Error uploading document:', err);
      toast({
        title: 'Eroare la încărcare',
        description: (err as Error).message || 'Nu s-a putut încărca documentul.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleUpload = async () => {
    if (!user?.id) {
      toast({
        title: 'Eroare',
        description: 'Trebuie să fiți conectat pentru a încărca documente.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload all documents that have files
      const uploadPromises = documents
        .filter(doc => doc.file && !doc.uploaded)
        .map(async (doc, index) => {
          const success = await uploadDocument(doc);
          if (success) {
            const newDocuments = [...documents];
            newDocuments[index] = { ...doc, uploaded: true };
            setDocuments(newDocuments);
          }
          return success;
        });

      const results = await Promise.all(uploadPromises);
      const allSuccessful = results.every(result => result);

      if (allSuccessful) {
        toast({
          title: 'Documente încărcate cu succes',
          description: 'Documentele au fost încărcate și trimise pentru verificare.',
        });
        
        if (onSuccess) {
          onSuccess();
        }
        
        onClose();
      } else {
        setError('Unele documente nu au putut fi încărcate. Vă rugăm să încercați din nou.');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'A apărut o eroare neașteptată.');
    } finally {
      setLoading(false);
    }
  };

  const hasRequiredDocuments = documents.some(doc => 
    doc.type === 'identity_document' && doc.file
  );

  const allDocumentsUploaded = documents
    .filter(doc => doc.file) // Only check documents that have files
    .every(doc => doc.uploaded);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Încărcare documente de identitate</DialogTitle>
          <DialogDescription>
            Pentru a activa contul de plată, trebuie să încărcați documentele de identitate necesare.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Document Upload Sections */}
          {documents.map((document, index) => (
            <div key={document.type} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{getDocumentLabel(document.type)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getDocumentDescription(document.type)}
                  </p>
                </div>
                {document.uploaded && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                {document.preview ? (
                  <div className="space-y-3">
                    <img
                      src={document.preview}
                      alt={`Preview ${getDocumentLabel(document.type)}`}
                      className="max-w-full h-48 object-contain rounded"
                    />
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newDocuments = [...documents];
                          newDocuments[index] = { ...document, file: null, preview: null, uploaded: false };
                          setDocuments(newDocuments);
                        }}
                        disabled={loading}
                      >
                        Schimbă
                      </Button>
                      {document.uploaded && (
                        <span className="text-sm text-green-600 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Încărcat
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Faceți clic pentru a încărca o imagine
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRefs.current[index]?.click()}
                      disabled={loading}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Încărcați imagine
                    </Button>
                  </div>
                )}
              </div>

              <input
                ref={(el) => (fileInputRefs.current[index] = el)}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileSelect(index, file);
                  }
                }}
                className="hidden"
              />
            </div>
          ))}

          {/* Requirements Info */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">Cerințe pentru documente:</p>
                <ul className="text-sm space-y-1">
                  <li>• Format: JPG, PNG (max 10MB)</li>
                  <li>• Document de identitate: CI sau pașaport</li>
                  <li>• Document cu adresa: factură recentă (opțional)</li>
                  <li>• Imagine clară și completă a documentului</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={handleUpload}
            disabled={!hasRequiredDocuments || loading || allDocumentsUploaded}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" />
                Se încarcă...
              </>
            ) : (
              <>
                <Upload className="mr-2" />
                Încărcați documentele
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Închide
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 