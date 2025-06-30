
import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, Upload, X, Plus, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

  const categories = [
    'Camere foto',
    'Obiective',
    'Drone',
    'Iluminat',
    'Audio',
    'Video',
    'Trepiere',
    'Accesorii',
    'Altele'
  ];

  const conditions = [
    'Nou',
    'Ca nou',
    'Foarte bună',
    'Bună',
    'Acceptabilă'
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setImages(prev => [...prev, event.target.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

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

    // Validare de bază
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

    // Simulare submit
    setTimeout(() => {
      toast({
        title: 'Echipament publicat cu succes!',
        description: 'Echipamentul tău este acum disponibil în platformă.',
      });
      setIsSubmitting(false);
      // Reset form
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Publică echipament nou
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Transformă-ți echipamentul neutilizat într-o sursă de venit și ajută comunitatea de creatori
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informații de bază */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-800">Informații de bază</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name" className="text-slate-700 font-medium">Nume echipament *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ex: Sony A7 III"
                    className="mt-2 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category" className="text-slate-700 font-medium">Categorie *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger className="mt-2 border-slate-200 focus:border-blue-500">
                      <SelectValue placeholder="Selectează categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="brand" className="text-slate-700 font-medium">Marca</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="ex: Sony, Canon, Nikon"
                    className="mt-2 border-slate-200 focus:border-blue-500"
                  />
                </div>
                <div>
                  <Label htmlFor="model" className="text-slate-700 font-medium">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="ex: A7 III, 5D Mark IV"
                    className="mt-2 border-slate-200 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-slate-700 font-medium">Descriere</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrie echipamentul, starea sa, utilizările recomandate..."
                  rows={4}
                  className="mt-2 border-slate-200 focus:border-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="condition" className="text-slate-700 font-medium">Starea echipamentului</Label>
                <Select 
                  value={formData.condition} 
                  onValueChange={(value) => setFormData({ ...formData, condition: value })}
                >
                  <SelectTrigger className="mt-2 border-slate-200 focus:border-blue-500">
                    <SelectValue placeholder="Selectează starea" />
                  </SelectTrigger>
                  <SelectContent>
                    {conditions.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Preț și disponibilitate */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-800">Preț și disponibilitate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="pricePerDay" className="text-slate-700 font-medium">Preț pe zi (RON) *</Label>
                  <Input
                    id="pricePerDay"
                    type="number"
                    value={formData.pricePerDay}
                    onChange={(e) => setFormData({ ...formData, pricePerDay: e.target.value })}
                    placeholder="120"
                    min="0"
                    className="mt-2 border-slate-200 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="depositAmount" className="text-slate-700 font-medium">Garanție (RON)</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    value={formData.depositAmount}
                    onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                    placeholder="500"
                    min="0"
                    className="mt-2 border-slate-200 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pickupLocation" className="text-slate-700 font-medium">Locația de preluare</Label>
                <Input
                  id="pickupLocation"
                  value={formData.pickupLocation}
                  onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                  placeholder="Cluj-Napoca"
                  className="mt-2 border-slate-200 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                <Switch
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) => setFormData({ ...formData, isAvailable: checked })}
                />
                <Label htmlFor="isAvailable" className="text-slate-700 font-medium">
                  Disponibil pentru închiriere
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Fotografii */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-800">Fotografii *</CardTitle>
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
                  
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 bg-gradient-to-br from-blue-25 to-purple-25 transition-colors">
                    <Upload className="h-6 w-6 text-blue-500" />
                    <span className="text-xs text-blue-600 mt-1 font-medium">Adaugă foto</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-sm text-slate-600">
                  Adaugă fotografii clare ale echipamentului. Prima fotografie va fi folosită ca imagine principală.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Specificații */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-800">Specificații tehnice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formData.specifications.map((spec, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={spec}
                      onChange={(e) => updateSpecification(index, e.target.value)}
                      placeholder="ex: ISO: 100-51200"
                      className="flex-1 border-slate-200 focus:border-blue-500"
                    />
                    {formData.specifications.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSpecification(index)}
                        className="border-slate-200 hover:border-red-300 hover:text-red-600"
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
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adaugă specificație
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ce este inclus */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-800">Ce este inclus în închiriere</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formData.includedItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={item}
                      onChange={(e) => updateIncludedItem(index, e.target.value)}
                      placeholder="ex: Geantă de transport"
                      className="flex-1 border-slate-200 focus:border-blue-500"
                    />
                    {formData.includedItems.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeIncludedItem(index)}
                        className="border-slate-200 hover:border-red-300 hover:text-red-600"
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
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adaugă item
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex space-x-4">
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 shadow-lg"
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
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
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
