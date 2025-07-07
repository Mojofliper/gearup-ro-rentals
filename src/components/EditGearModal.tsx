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
    title: gear?.title || '',
    description: gear?.description || '',
    category_id: gear?.category_id || '',
            daily_rate: gear?.daily_rate || 0,
    deposit_amount: gear?.deposit_amount || 0,
    location: gear?.location || '',
    status: gear?.status || 'available'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.daily_rate) {
      toast({
        title: 'Câmpuri obligatorii',
        description: 'Te rugăm să completezi numele și prețul pe zi.',
        variant: 'destructive',
      });
      return;
    }

    const updates = {
      ...formData,
              daily_rate: Math.round(formData.daily_rate),
      deposit_amount: Math.round(formData.deposit_amount),
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
              <Label htmlFor="title">Nume echipament *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
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
              <Label htmlFor="location">Locație</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="ex. București, Piața Unirii"
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
              <Label htmlFor="daily_rate">Preț pe zi (RON) *</Label>
              <Input
                id="daily_rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.daily_rate}
                onChange={(e) => handleInputChange('daily_rate', e.target.value)}
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

          {/* Availability */}
          <div className="flex items-center space-x-2">
            <Switch
              id="status"
              checked={formData.status === 'available'}
              onCheckedChange={(checked) => handleInputChange('status', checked ? 'available' : 'inactive')}
            />
            <Label htmlFor="status">Disponibil pentru închiriere</Label>
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
