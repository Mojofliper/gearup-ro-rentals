
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BasicInfoProps {
  formData: any;
  setFormData: (data: any) => void;
}

export const BasicInfo: React.FC<BasicInfoProps> = ({ formData, setFormData }) => {
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

  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader>
        <CardTitle className="text-2xl text-gray-800">Informații de bază</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="name" className="text-gray-700 font-medium">Nume echipament *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ex: Sony A7 III"
              className="mt-2 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <Label htmlFor="category" className="text-gray-700 font-medium">Categorie *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              required
            >
              <SelectTrigger className="mt-2 border-gray-200 focus:border-purple-500">
                <SelectValue placeholder="Selectează categoria" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
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
            <Label htmlFor="brand" className="text-gray-700 font-medium">Marca</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="ex: Sony, Canon, Nikon"
              className="mt-2 border-gray-200 focus:border-purple-500"
            />
          </div>
          <div>
            <Label htmlFor="model" className="text-gray-700 font-medium">Model</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="ex: A7 III, 5D Mark IV"
              className="mt-2 border-gray-200 focus:border-purple-500"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description" className="text-gray-700 font-medium">Descriere</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descrie echipamentul, starea sa, utilizările recomandate..."
            rows={4}
            className="mt-2 border-gray-200 focus:border-purple-500"
          />
        </div>

        <div>
          <Label htmlFor="condition" className="text-gray-700 font-medium">Starea echipamentului</Label>
          <Select 
            value={formData.condition} 
            onValueChange={(value) => setFormData({ ...formData, condition: value })}
          >
            <SelectTrigger className="mt-2 border-gray-200 focus:border-purple-500">
              <SelectValue placeholder="Selectează starea" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
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
  );
};
