import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Save, Loader2, AlertTriangle, 
  Camera, Package, MapPin, DollarSign, Shield
} from 'lucide-react';
import { useGearById, useUpdateGear } from '@/hooks/useGear';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { validateGearName, validateGearDescription, validatePrice, sanitizeInput } from '@/utils/validation';

export const EditGear: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: gear, isLoading, error } = useGearById(id || '');
  const { mutate: updateGear, isPending } = useUpdateGear();
  const { data: categories = [] } = useCategories();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    brand: '',
    model: '',
    condition: 'Bună',
    price_per_day: 0,
    deposit_amount: 0,
    pickup_location: '',
    specifications: [] as string[],
    included_items: [] as string[],
    is_available: true,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [newSpecification, setNewSpecification] = useState('');
  const [newIncludedItem, setNewIncludedItem] = useState('');

  // Initialize form data when gear is loaded
  useEffect(() => {
    if (gear) {
      setFormData({
        title: (gear.title as string) || '',
        description: (gear.description as string) || '',
        category_id: (gear.category_id as string) || '',
        brand: (gear.brand as string) || '',
        model: (gear.model as string) || '',
        condition: (gear.condition as string) || 'Bună',
        price_per_day: (gear.price_per_day as number) || 0,
        deposit_amount: (gear.deposit_amount as number) || 0,
        pickup_location: (gear.pickup_location as string) || '',
        specifications: (gear.specifications as string[]) || [],
        included_items: (gear.included_items as string[]) || [],
        is_available: gear.is_available !== false,
      });
    }
  }, [gear]);

  // Check if user owns this gear
  useEffect(() => {
    if (gear && user && gear.owner_id !== user.id) {
      toast.error('Nu ai permisiunea să editezi acest echipament');
      navigate('/my-listings');
    }
  }, [gear, user, navigate]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Numele echipamentului este obligatoriu';
    } else if (!validateGearName(formData.title)) {
      errors.title = 'Numele echipamentului trebuie să aibă între 3 și 100 de caractere';
    }

    if (formData.description && !validateGearDescription(formData.description)) {
      errors.description = 'Descrierea trebuie să aibă între 10 și 1000 de caractere';
    }

    if (!formData.price_per_day || formData.price_per_day <= 0) {
      errors.price_per_day = 'Prețul pe zi trebuie să fie mai mare decât 0';
    } else if (!validatePrice(formData.price_per_day.toString())) {
      errors.price_per_day = 'Prețul pe zi trebuie să fie un număr valid';
    }

    if (formData.deposit_amount && formData.deposit_amount < 0) {
      errors.deposit_amount = 'Garanția nu poate fi negativă';
    }

    if (!formData.category_id) {
      errors.category_id = 'Categoria este obligatorie';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Te rugăm să corectezi erorile din formular');
      return;
    }

    if (!id) {
      toast.error('ID-ul echipamentului lipsește');
      return;
    }

    const updates = {
      title: sanitizeInput(formData.title),
      description: formData.description ? sanitizeInput(formData.description) : null,
      category_id: formData.category_id,
      price_per_day: Math.round(formData.price_per_day),
      deposit_amount: Math.round(formData.deposit_amount),
      pickup_location: formData.pickup_location ? sanitizeInput(formData.pickup_location) : 'Romania',
      brand: formData.brand ? sanitizeInput(formData.brand) : null,
      model: formData.model ? sanitizeInput(formData.model) : null,
      condition: formData.condition,
      specifications: formData.specifications,
      included_items: formData.included_items,
      is_available: formData.is_available,
    };

    updateGear({
      gearId: id,
      updates
    }, {
      onSuccess: () => {
        toast.success('Echipamentul a fost actualizat cu succes!');
        navigate('/my-listings');
      },
      onError: (error: unknown) => {
        toast.error('Eroare la actualizarea echipamentului. Te rugăm să încerci din nou.');
        console.error('Update error:', error);
      }
    });
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addSpecification = () => {
    if (newSpecification.trim()) {
      setFormData(prev => ({
        ...prev,
        specifications: [...prev.specifications, newSpecification.trim()]
      }));
      setNewSpecification('');
    }
  };

  const removeSpecification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index)
    }));
  };

  const addIncludedItem = () => {
    if (newIncludedItem.trim()) {
      setFormData(prev => ({
        ...prev,
        included_items: [...prev.included_items, newIncludedItem.trim()]
      }));
      setNewIncludedItem('');
    }
  };

  const removeIncludedItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      included_items: prev.included_items.filter((_, i) => i !== index)
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="flex items-center justify-center h-48 sm:h-64">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !gear) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 sm:h-12 sm:w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold mb-2">Echipamentul nu a fost găsit</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">Echipamentul pe care încerci să îl editezi nu există sau nu ai permisiunea să îl accesezi.</p>
            <Button onClick={() => navigate('/my-listings')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Înapoi la echipamentele mele
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />
      
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/my-listings')}
              className="hover:bg-white/50 w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Înapoi
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Editează echipamentul</h1>
              <p className="text-sm sm:text-base text-gray-600">Actualizează informațiile despre echipamentul tău</p>
            </div>
          </div>
          <Badge variant={formData.is_available ? "default" : "secondary"} className="w-fit">
            {formData.is_available ? "Disponibil" : "Indisponibil"}
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Informații de bază</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="title" className="text-sm sm:text-base">Nume echipament *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="ex. Sony A7 III"
                    className={`mt-1 ${validationErrors.title ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.title && (
                    <p className="text-xs sm:text-sm text-red-500 mt-1">{validationErrors.title}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="category" className="text-sm sm:text-base">Categorie *</Label>
                  <Select 
                    value={formData.category_id} 
                    onValueChange={(value) => handleInputChange('category_id', value)}
                  >
                    <SelectTrigger className={`mt-1 ${validationErrors.category_id ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Selectează categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.category_id && (
                    <p className="text-xs sm:text-sm text-red-500 mt-1">{validationErrors.category_id}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="brand" className="text-sm sm:text-base">Marcă</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    placeholder="ex. Sony"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="model" className="text-sm sm:text-base">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    placeholder="ex. A7 III"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="condition" className="text-sm sm:text-base">Stare</Label>
                  <Select 
                    value={formData.condition} 
                    onValueChange={(value) => handleInputChange('condition', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excelentă">Excelentă</SelectItem>
                      <SelectItem value="Bună">Bună</SelectItem>
                      <SelectItem value="Satisfăcătoare">Satisfăcătoare</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm sm:text-base">Descriere</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descrie echipamentul și caracteristicile sale..."
                  rows={4}
                  className={`mt-1 ${validationErrors.description ? 'border-red-500' : ''}`}
                />
                {validationErrors.description && (
                  <p className="text-xs sm:text-sm text-red-500 mt-1">{validationErrors.description}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Preț și locație</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="price_per_day" className="text-sm sm:text-base">Preț pe zi (RON) *</Label>
                  <Input
                    id="price_per_day"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.price_per_day}
                    onChange={(e) => handleInputChange('price_per_day', parseFloat(e.target.value) || 0)}
                    placeholder="ex. 50"
                    className={`mt-1 ${validationErrors.price_per_day ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.price_per_day && (
                    <p className="text-xs sm:text-sm text-red-500 mt-1">{validationErrors.price_per_day}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="deposit_amount" className="text-sm sm:text-base">Garanție (RON)</Label>
                  <Input
                    id="deposit_amount"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.deposit_amount}
                    onChange={(e) => handleInputChange('deposit_amount', parseFloat(e.target.value) || 0)}
                    placeholder="ex. 200"
                    className={`mt-1 ${validationErrors.deposit_amount ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.deposit_amount && (
                    <p className="text-xs sm:text-sm text-red-500 mt-1">{validationErrors.deposit_amount}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="pickup_location" className="text-sm sm:text-base">Locație de ridicare</Label>
                <Input
                  id="pickup_location"
                  value={formData.pickup_location}
                  onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                  placeholder="ex. București, Piața Unirii"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Specifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Specificații tehnice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={newSpecification}
                  onChange={(e) => setNewSpecification(e.target.value)}
                  placeholder="Adaugă o specificație..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecification())}
                  className="flex-1"
                />
                <Button type="button" onClick={addSpecification} variant="outline" className="text-xs sm:text-sm">
                  Adaugă
                </Button>
              </div>
              {formData.specifications.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.specifications.map((spec, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1 text-xs sm:text-sm">
                      <span>{spec}</span>
                      <button
                        type="button"
                        onClick={() => removeSpecification(index)}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Included Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Elemente incluse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={newIncludedItem}
                  onChange={(e) => setNewIncludedItem(e.target.value)}
                  placeholder="Adaugă un element inclus..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIncludedItem())}
                  className="flex-1"
                />
                <Button type="button" onClick={addIncludedItem} variant="outline" className="text-xs sm:text-sm">
                  Adaugă
                </Button>
              </div>
              {formData.included_items.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.included_items.map((item, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1 text-xs sm:text-sm">
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => removeIncludedItem(index)}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Disponibilitate</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_available"
                  checked={formData.is_available}
                  onCheckedChange={(checked) => handleInputChange('is_available', checked)}
                />
                <Label htmlFor="is_available" className="text-sm sm:text-base">Disponibil pentru închiriere</Label>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/my-listings')}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              Anulează
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto min-w-[140px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Se salvează...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvează modificările
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}; 