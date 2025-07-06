
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useUpdateGear } from '@/hooks/useGear';
import { useCategories } from '@/hooks/useCategories';
import { toast } from '@/hooks/use-toast';

interface EditGearModalProps {
  isOpen: boolean;
  onClose: () => void;
  gear: any;
}

export const EditGearModal: React.FC<EditGearModalProps> = ({
  isOpen,
  onClose,
  gear
}) => {
  const { mutate: updateGear, isPending } = useUpdateGear();
  const { data: categories = [] } = useCategories();

  const [formData, setFormData] = useState({
    name: gear?.name || '',
    description: gear?.description || '',
    brand: gear?.brand || '',
    model: gear?.model || '',
    category_id: gear?.category_id || '',
    price_per_day: gear?.price_per_day ? (gear.price_per_day / 100).toString() : '',
    deposit_amount: gear?.deposit_amount ? (gear.deposit_amount / 100).toString() : '',
    condition: gear?.condition || '',
    pickup_location: gear?.pickup_location || '',
    is_available: gear?.is_available ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price_per_day) {
      toast({
        title: 'Câmpuri obligatorii',
        description: 'Te rugăm să completezi numele și prețul pe zi.',
        variant: 'destructive',
      });
      return;
    }

    const updates = {
      ...formData,
      price_per_day: Math.round(parseFloat(formData.price_per_day) * 100),
      deposit_amount: formData.deposit_amount ? Math.round(parseFloat(formData.deposit_amount) * 100) : 0,
    };

    updateGear({
      id: gear.id,
      updates
    }, {
      onSuccess: () => {
        toast({
          title: 'Echipament actualizat!',
          description: 'Modificările au fost salvate cu succes.',
        });
        onClose();
      },
      onError: (error: any) => {
        toast({
          title: 'Eroare',
          description: 'Nu s-au putut salva modificările. Te rugăm să încerci din nou.',
          variant: 'destructive',
        });
        console.error('Update error:', error);
      }
    });
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editează echipamentul</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nume echipament *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="ex. Sony A7 III"
              />
            </div>
            <div>
              <Label htmlFor="category">Categorie</Label>
              <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                <SelectTrigger>
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
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand">Marcă</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                placeholder="ex. Sony"
              />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                placeholder="ex. A7 III"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descriere</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descrie echipamentul și caracteristicile sale..."
              rows={3}
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price_per_day">Preț pe zi (RON) *</Label>
              <Input
                id="price_per_day"
                type="number"
                step="0.01"
                min="0"
                value={formData.price_per_day}
                onChange={(e) => handleInputChange('price_per_day', e.target.value)}
                placeholder="ex. 50"
              />
            </div>
            <div>
              <Label htmlFor="deposit_amount">Garanție (RON)</Label>
              <Input
                id="deposit_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.deposit_amount}
                onChange={(e) => handleInputChange('deposit_amount', e.target.value)}
                placeholder="ex. 200"
              />
            </div>
          </div>

          {/* Condition & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="condition">Stare</Label>
              <Select value={formData.condition} onValueChange={(value) => handleInputChange('condition', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectează starea" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Nou</SelectItem>
                  <SelectItem value="excellent">Excelent</SelectItem>
                  <SelectItem value="very-good">Foarte bună</SelectItem>
                  <SelectItem value="good">Bună</SelectItem>
                  <SelectItem value="fair">Acceptabilă</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pickup_location">Locația de preluare</Label>
              <Input
                id="pickup_location"
                value={formData.pickup_location}
                onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                placeholder="ex. Centrul orașului"
              />
            </div>
          </div>

          {/* Availability */}
          <div className="flex items-center space-x-2">
            <Switch
              id="is_available"
              checked={formData.is_available}
              onCheckedChange={(checked) => handleInputChange('is_available', checked)}
            />
            <Label htmlFor="is_available">Disponibil pentru închiriere</Label>
          </div>
        </form>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isPending}
          >
            Anulează
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? 'Se salvează...' : 'Salvează modificările'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
