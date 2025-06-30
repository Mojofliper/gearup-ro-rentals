
import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, Check, Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BasicInfo } from './AddGear/BasicInfo';
import { PhotoUpload } from './AddGear/PhotoUpload';

export const AddGear: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    pricePerDay: '',
    depositAmount: '',
    condition: '',
    brand: '',
    model: '',
    isAvailable: true,
    pickupLocation: user?.location || '',
    specifications: [''],
    includedItems: ['']
  });
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addSpecification = () => {
    setFormData({
      ...formData,
      specifications: [...formData.specifications, '']
    });
  };

  const updateSpecification = (index: number, value: string) => {
    const newSpecs = [...formData.specifications];
    newSpecs[index] = value;
    setFormData({ ...formData, specifications: newSpecs });
  };

  const removeSpecification = (index: number) => {
    if (formData.specifications.length > 1) {
      setFormData({
        ...formData,
        specifications: formData.specifications.filter((_, i) => i !== index)
      });
    }
  };

  const addIncludedItem = () => {
    setFormData({
      ...formData,
      includedItems: [...formData.includedItems, '']
    });
  };

  const updateIncludedItem = (index: number, value: string) => {
    const newItems = [...formData.includedItems];
    newItems[index] = value;
    setFormData({ ...formData, includedItems: newItems });
  };

  const removeIncludedItem = (index: number) => {
    if (formData.includedItems.length > 1) {
      setFormData({
        ...formData,
        includedItems: formData.includedItems.filter((_, i) => i !== index)
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.category || !formData.pricePerDay) {
      toast({
        title: 'Câmpuri incomplete',
        description: 'Completează toate câmpurile obligatorii pentru a continua.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    if (images.length === 0) {
      toast({
        title: 'Fotografii lipsă',
        description: 'Adaugă cel puțin o fotografie a echipamentului.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    setTimeout(() => {
      toast({
        title: 'Echipament publicat cu succes!',
        description: 'Echipamentul tău este acum disponibil în platformă.',
      });
      setIsSubmitting(false);
      setFormData({
        name: '',
        category: '',
        description: '',
        pricePerDay: '',
        depositAmount: '',
        condition: '',
        brand: '',
        model: '',
        isAvailable: true,
        pickupLocation: user?.location || '',
        specifications: [''],
        includedItems: ['']
      });
      setImages([]);
    }, 2000);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Publică echipament nou
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transformă-ți echipamentul neutilizat într-o sursă de venit și ajută comunitatea de creatori
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <BasicInfo formData={formData} setFormData={setFormData} />

          <Card className="shadow-lg border-0 bg-white">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-800">Preț și disponibilitate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="pricePerDay" className="text-gray-700 font-medium">Preț pe zi (RON) *</Label>
                  <Input
                    id="pricePerDay"
                    type="number"
                    value={formData.pricePerDay}
                    onChange={(e) => setFormData({ ...formData, pricePerDay: e.target.value })}
                    placeholder="120"
                    min="0"
                    className="mt-2 border-gray-200 focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="depositAmount" className="text-gray-700 font-medium">Garanție (RON)</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    value={formData.depositAmount}
                    onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                    placeholder="500"
                    min="0"
                    className="mt-2 border-gray-200 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pickupLocation" className="text-gray-700 font-medium">Locația de preluare</Label>
                <Input
                  id="pickupLocation"
                  value={formData.pickupLocation}
                  onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                  placeholder="Cluj-Napoca"
                  className="mt-2 border-gray-200 focus:border-purple-500"
                />
              </div>

              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                <Switch
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) => setFormData({ ...formData, isAvailable: checked })}
                />
                <Label htmlFor="isAvailable" className="text-gray-700 font-medium">
                  Disponibil pentru închiriere
                </Label>
              </div>
            </CardContent>
          </Card>

          <PhotoUpload images={images} setImages={setImages} />

          <Card className="shadow-lg border-0 bg-white">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-800">Specificații tehnice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formData.specifications.map((spec, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={spec}
                      onChange={(e) => updateSpecification(index, e.target.value)}
                      placeholder="ex: ISO: 100-51200"
                      className="flex-1 border-gray-200 focus:border-purple-500"
                    />
                    {formData.specifications.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSpecification(index)}
                        className="border-gray-200 hover:border-red-300 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSpecification}
                  className="border-purple-200 text-purple-600 hover:bg-purple-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adaugă specificație
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-800">Ce este inclus în închiriere</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formData.includedItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={item}
                      onChange={(e) => updateIncludedItem(index, e.target.value)}
                      placeholder="ex: Geantă de transport"
                      className="flex-1 border-gray-200 focus:border-purple-500"
                    />
                    {formData.includedItems.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeIncludedItem(index)}
                        className="border-gray-200 hover:border-red-300 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addIncludedItem}
                  className="border-purple-200 text-purple-600 hover:bg-purple-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adaugă item
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 shadow-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Camera className="h-5 w-5 mr-2 animate-pulse" />
                  Se procesează...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Publică echipamentul
                </>
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              className="border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Salvează draft
            </Button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
};
