
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, AlertTriangle } from 'lucide-react';
import { validateImageFile } from '@/utils/validation';
import { toast } from '@/hooks/use-toast';

interface PhotoUploadProps {
  images: string[];
  setImages: (images: string[]) => void;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ images, setImages }) => {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        // Validate file
        const validationError = validateImageFile(file);
        if (validationError) {
          toast({
            title: 'Fișier invalid',
            description: validationError,
            variant: 'destructive',
          });
          return;
        }

        // Check total number of images
        if (images.length >= 10) {
          toast({
            title: 'Prea multe imagini',
            description: 'Poți adăuga maximum 10 imagini.',
            variant: 'destructive',
          });
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setImages([...images, event.target.result as string]);
          }
        };
        reader.onerror = () => {
          toast({
            title: 'Eroare la încărcare',
            description: 'Nu am putut încărca imaginea. Te rugăm să încerci din nou.',
            variant: 'destructive',
          });
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader>
        <CardTitle className="text-2xl text-gray-800">Fotografii *</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg shadow-md"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
                {index === 0 && (
                  <div className="absolute bottom-1 left-1 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                    Principală
                  </div>
                )}
              </div>
            ))}
            
            {images.length < 10 && (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:bg-purple-50 bg-gradient-to-br from-purple-25 to-pink-25 transition-colors">
                <Upload className="h-6 w-6 text-purple-500" />
                <span className="text-xs text-purple-600 mt-1 font-medium">Adaugă foto</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Instrucțiuni pentru fotografii:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Folosește doar imagini JPG, PNG sau WebP</li>
                  <li>• Dimensiunea maximă: 5MB per imagine</li>
                  <li>• Maximum 10 imagini per echipament</li>
                  <li>• Prima imagine va fi imaginea principală</li>
                  <li>• Fotografiile trebuie să fie clare și relevante</li>
                </ul>
              </div>
            </div>
          </div>
          
          {images.length === 0 && (
            <p className="text-sm text-gray-600">
              Adaugă fotografii clare ale echipamentului. Prima fotografie va fi folosită ca imagine principală.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
