
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
import { Camera, Upload, X, Plus } from 'lucide-react';
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
      // În aplicația reală ar face upload pe server
      // Aici simulăm cu URLs mock
      const newImages = Array.from(files).map((file, index) => 
        `https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop&t=${Date.now()}-${index}`
      );
      setImages([...images, ...newImages]);
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
        title: 'Eroare validare',
        description: 'Te rugăm să completezi toate câmpurile obligatorii.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    if (images.length === 0) {
      toast({
        title: 'Eroare validare',
        description: 'Te rugăm să adaugi cel puțin o fotografie.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    // Simulare submit
    setTimeout(() => {
      toast({
        title: 'Echipament adăugat cu succes!',
        description: 'Echipamentul tău va fi vizibil după verificare.',
      });
      setIsSubmitting(false);
      // În aplicația reală ar redirecta către pagina de echipamente
    }, 2000);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Adaugă echipament nou</h1>
          <p className="text-muted-foreground">
            Pune-ți echipamentul la dispoziția comunității de creatori români
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informații de bază */}
          <Card>
            <CardHeader>
              <CardTitle>Informații de bază</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nume echipament *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ex: Sony A7 III"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categorie *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="ex: Sony, Canon, Nikon"
                  />
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="ex: A7 III, 5D Mark IV"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descriere</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrie echipamentul, starea sa, utilizările recomandate..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="condition">Starea echipamentului</Label>
                <Select 
                  value={formData.condition} 
                  onValueChange={(value) => setFormData({ ...formData, condition: value })}
                >
                  <SelectTrigger>
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
          <Card>
            <CardHeader>
              <CardTitle>Preț și disponibilitate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pricePerDay">Preț pe zi (RON) *</Label>
                  <Input
                    id="pricePerDay"
                    type="number"
                    value={formData.pricePerDay}
                    onChange={(e) => setFormData({ ...formData, pricePerDay: e.target.value })}
                    placeholder="120"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="depositAmount">Garanție (RON)</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    value={formData.depositAmount}
                    onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                    placeholder="500"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pickupLocation">Locația de preluare</Label>
                <Input
                  id="pickupLocation"
                  value={formData.pickupLocation}
                  onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                  placeholder="Cluj-Napoca"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) => setFormData({ ...formData, isAvailable: checked })}
                />
                <Label htmlFor="isAvailable">Disponibil pentru închiriere</Label>
              </div>
            </CardContent>
          </Card>

          {/* Fotografii */}
          <Card>
            <CardHeader>
              <CardTitle>Fotografii *</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <Upload className="h-6 w-6 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">Adaugă foto</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Adaugă cel puțin o fotografie. Prima fotografie va fi folosită ca imagine principală.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Specificații */}
          <Card>
            <CardHeader>
              <CardTitle>Specificații tehnice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formData.specifications.map((spec, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={spec}
                      onChange={(e) => updateSpecification(index, e.target.value)}
                      placeholder="ex: ISO: 100-51200"
                      className="flex-1"
                    />
                    {formData.specifications.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSpecification(index)}
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
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adaugă specificație
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ce este inclus */}
          <Card>
            <CardHeader>
              <CardTitle>Ce este inclus în închiriere</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formData.includedItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={item}
                      onChange={(e) => updateIncludedItem(index, e.target.value)}
                      placeholder="ex: Geantă de transport"
                      className="flex-1"
                    />
                    {formData.includedItems.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeIncludedItem(index)}
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
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Camera className="h-4 w-4 mr-2 animate-spin" />
                  Se procesează...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Publică echipamentul
                </>
              )}
            </Button>
            <Button type="button" variant="outline">
              Salvează ca draft
            </Button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
};
