
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X } from 'lucide-react';

interface PhotoUploadProps {
  images: string[];
  setImages: (images: string[]) => void;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ images, setImages }) => {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setImages([...images, event.target.result as string]);
          }
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
              </div>
            ))}
            
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:bg-purple-50 bg-gradient-to-br from-purple-25 to-pink-25 transition-colors">
              <Upload className="h-6 w-6 text-purple-500" />
              <span className="text-xs text-purple-600 mt-1 font-medium">Adaugă foto</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-sm text-gray-600">
            Adaugă fotografii clare ale echipamentului. Prima fotografie va fi folosită ca imagine principală.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
