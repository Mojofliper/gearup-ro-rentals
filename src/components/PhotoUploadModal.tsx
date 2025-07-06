
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  photoType: 'pickup' | 'return';
  onPhotoUploaded: (photoUrl: string) => void;
}

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  photoType,
  onPhotoUploaded
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${bookingId}/${photoType}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('booking-photos')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('booking-photos')
        .getPublicUrl(fileName);

      // Save to photo_uploads table
      const { error: dbError } = await supabase
        .from('photo_uploads')
        .insert({
          booking_id: bookingId,
          photo_type: photoType,
          photo_url: publicUrl,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id || '',
          metadata: {
            original_name: selectedFile.name,
            file_size: selectedFile.size,
            mime_type: selectedFile.type
          }
        });

      if (dbError) throw dbError;

      onPhotoUploaded(publicUrl);
      toast({
        title: 'Fotografie încărcată',
        description: 'Fotografia a fost salvată cu succes.',
      });
      onClose();
    } catch (error: any) {
      console.error('Photo upload error:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut încărca fotografia. Te rugăm să încerci din nou.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Încarcă fotografie {photoType === 'pickup' ? 'la preluare' : 'la returnare'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {previewUrl ? (
            <div className="relative">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-64 object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                  setSelectedFile(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <div className="flex flex-col items-center space-y-4">
                <Camera className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Selectează o fotografie</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fotografia trebuie să arate starea echipamentului
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Alege fișier
                </Button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Anulează
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'Se încarcă...' : 'Încarcă fotografia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
