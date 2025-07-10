import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PhotoDocumentationProps {
  bookingId: string;
  gearId: string;
  onComplete?: () => void;
  isOwner?: boolean;
}

interface PhotoUpload {
  id: string;
  file: File;
  url?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export const PhotoDocumentation: React.FC<PhotoDocumentationProps> = ({
  bookingId,
  gearId,
  onComplete,
  isOwner = false
}) => {
  const [uploads, setUploads] = useState<PhotoUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();

  const getPresignedUrl = async (fileName: string, contentType: string) => {
    try {
      const response = await fetch('/api/handover-photo-presigned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          gearId,
          fileName,
          contentType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get presigned URL');
      }

      const data = await response.json();
      return data.presignedUrl;
    } catch (error) {
      console.error('Error getting presigned URL:', error);
      throw error;
    }
  };

  const uploadToStorage = async (file: File, presignedUrl: string, uploadId: string) => {
    try {
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.url.split('?')[0]; // Remove query parameters
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newUploads: PhotoUpload[] = files.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
      progress: 0,
    }));

    setUploads(prev => [...prev, ...newUploads]);
    setIsUploading(true);

    // Process each file
    for (const upload of newUploads) {
      try {
        // Update status to uploading
        setUploads(prev => prev.map(u => 
          u.id === upload.id ? { ...u, status: 'uploading', progress: 10 } : u
        ));

        // Get presigned URL
        const presignedUrl = await getPresignedUrl(upload.file.name, upload.file.type);
        
        setUploads(prev => prev.map(u => 
          u.id === upload.id ? { ...u, progress: 30 } : u
        ));

        // Upload to storage
        const uploadedUrl = await uploadToStorage(upload.file, presignedUrl, upload.id);
        
        setUploads(prev => prev.map(u => 
          u.id === upload.id ? { 
            ...u, 
            status: 'success', 
            progress: 100, 
            url: uploadedUrl 
          } : u
        ));

        toast({
          title: "Fotografie încărcată cu succes",
          description: `${upload.file.name} a fost încărcat.`,
        });

      } catch (error) {
        console.error('Upload error:', error);
        setUploads(prev => prev.map(u => 
          u.id === upload.id ? { 
            ...u, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Upload failed' 
          } : u
        ));

        toast({
          title: "Încărcare eșuată",
          description: `Nu s-a putut încărca ${upload.file.name}.`,
          variant: "destructive",
        });
      }
    }

    setIsUploading(false);
    
    // Check if all uploads are complete
    const allComplete = newUploads.every(upload => 
      upload.status === 'success' || upload.status === 'error'
    );
    
    if (allComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [bookingId, gearId, onComplete, toast]);

  const removeUpload = (uploadId: string) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const retryUpload = async (upload: PhotoUpload) => {
    try {
      setUploads(prev => prev.map(u => 
        u.id === upload.id ? { ...u, status: 'uploading', progress: 10, error: undefined } : u
      ));

      const presignedUrl = await getPresignedUrl(upload.file.name, upload.file.type);
      
      setUploads(prev => prev.map(u => 
        u.id === upload.id ? { ...u, progress: 30 } : u
      ));

      const uploadedUrl = await uploadToStorage(upload.file, presignedUrl, upload.id);
      
      setUploads(prev => prev.map(u => 
        u.id === upload.id ? { 
          ...u, 
          status: 'success', 
          progress: 100, 
          url: uploadedUrl,
          error: undefined
        } : u
      ));

      toast({
        title: "Încărcare reîncercată cu succes",
        description: `${upload.file.name} a fost încărcat.`,
      });

    } catch (error) {
      console.error('Retry upload error:', error);
      setUploads(prev => prev.map(u => 
        u.id === upload.id ? { 
          ...u, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        } : u
      ));

      toast({
        title: "Reîncercare eșuată",
        description: `Nu s-a putut încărca ${upload.file.name}.`,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: PhotoUpload['status']) => {
    switch (status) {
      case 'pending':
        return <Upload className="h-4 w-4" />;
      case 'uploading':
        return <Upload className="h-4 w-4 animate-pulse" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: PhotoUpload['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'uploading':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Documentație Fotografică
        </CardTitle>
        <CardDescription>
          {isOwner 
            ? "Încarcă fotografii cu starea echipamentului înainte de predarea către chiriaș"
            : "Încarcă fotografii cu starea echipamentului la ridicare"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isComplete && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Documentație fotografică completă! Toate fotografiile au fost încărcate cu succes.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Încarcă Fotografii</h4>
              <p className="text-sm text-gray-600">
                Luați fotografii care arată starea curentă a echipamentului
              </p>
            </div>
            <Button
              onClick={() => document.getElementById('photo-upload')?.click()}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              <Camera className="h-4 w-4" />
              {isUploading ? 'Încărcare...' : 'Adăugare Fotografii'}
            </Button>
          </div>

          <input
            id="photo-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            capture="environment"
          />

          {uploads.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Progres Încărcare</h4>
              {uploads.map((upload) => (
                <div key={upload.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(upload.status)}
                      <span className="text-sm font-medium">{upload.file.name}</span>
                      <Badge className={getStatusColor(upload.status)}>
                        {upload.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {upload.status === 'error' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryUpload(upload)}
                        >
                          Reîncercare
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUpload(upload.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {upload.status === 'uploading' && (
                    <Progress value={upload.progress} className="w-full" />
                  )}
                  
                  {upload.status === 'error' && upload.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{upload.error}</AlertDescription>
                    </Alert>
                  )}
                  
                  {upload.status === 'success' && upload.url && (
                    <div className="mt-2">
                      <img
                        src={upload.url}
                        alt={upload.file.name}
                        className="w-20 h-20 object-cover rounded border"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {uploads.length === 0 && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Nu există fotografii încărcate</p>
              <p className="text-sm text-gray-500">
                Faceți clic pe "Adăugare Fotografii" pentru a începe documentarea stării echipamentului
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 