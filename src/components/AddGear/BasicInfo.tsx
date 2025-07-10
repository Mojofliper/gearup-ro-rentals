import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useState } from "react";

interface BasicInfoProps {
  formData: {
    name: string;
    description: string;
    categoryId: string;
    brand: string;
    model: string;
    condition: string;
    pricePerDay: string;
    depositAmount: string;
    pickupLocation: string;
    specifications: string[];
    includedItems: string[];
  };
  updateFormData: (updates: Partial<BasicInfoProps["formData"]>) => void;
  validationErrors: Record<string, string>;
}

export const BasicInfo: React.FC<BasicInfoProps> = ({
  formData,
  updateFormData,
  validationErrors,
}) => {
  const { data: categories = [] } = useCategories();
  const [newSpecification, setNewSpecification] = useState("");
  const [newIncludedItem, setNewIncludedItem] = useState("");

  const addSpecification = () => {
    if (newSpecification.trim()) {
      updateFormData({
        specifications: [...formData.specifications, newSpecification.trim()],
      });
      setNewSpecification("");
    }
  };

  const removeSpecification = (index: number) => {
    updateFormData({
      specifications: formData.specifications.filter((_, i) => i !== index),
    });
  };

  const addIncludedItem = () => {
    if (newIncludedItem.trim()) {
      updateFormData({
        includedItems: [...formData.includedItems, newIncludedItem.trim()],
      });
      setNewIncludedItem("");
    }
  };

  const removeIncludedItem = (index: number) => {
    updateFormData({
      includedItems: formData.includedItems.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-8">
      {/* Basic Information */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <CardTitle className="text-2xl text-gray-800">
            Informații generale *
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Numele echipamentului *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="ex. Sony A7 III"
                className={`mt-1 ${validationErrors.name ? "border-red-500" : ""}`}
              />
              {validationErrors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {validationErrors.name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => updateFormData({ categoryId: value })}
              >
                <SelectTrigger
                  className={`mt-1 ${validationErrors.categoryId ? "border-red-500" : ""}`}
                >
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
              {validationErrors.categoryId && (
                <p className="text-sm text-red-500 mt-1">
                  {validationErrors.categoryId}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => updateFormData({ brand: e.target.value })}
                placeholder="ex. Sony"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="model">Modelul</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => updateFormData({ model: e.target.value })}
                placeholder="ex. A7 III"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="condition">Starea echipamentului *</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => updateFormData({ condition: value })}
              >
                <SelectTrigger
                  className={`mt-1 ${validationErrors.condition ? "border-red-500" : ""}`}
                >
                  <SelectValue placeholder="Selectează starea" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nou">Nou</SelectItem>
                  <SelectItem value="Ca nou">Ca nou</SelectItem>
                  <SelectItem value="Foarte bună">Foarte bună</SelectItem>
                  <SelectItem value="Bună">Bună</SelectItem>
                  <SelectItem value="Acceptabilă">Acceptabilă</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.condition && (
                <p className="text-sm text-red-500 mt-1">
                  {validationErrors.condition}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="pickupLocation">Locația de ridicare</Label>
              <Input
                id="pickupLocation"
                value={formData.pickupLocation}
                onChange={(e) =>
                  updateFormData({ pickupLocation: e.target.value })
                }
                placeholder="ex. Centrul Clujului"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrierea echipamentului</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
              placeholder="Descrie echipamentul tău, pentru ce este potrivit, ce experiență oferă..."
              rows={4}
              className={`mt-1 ${validationErrors.description ? "border-red-500" : ""}`}
            />
            {validationErrors.description && (
              <p className="text-sm text-red-500 mt-1">
                {validationErrors.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <CardTitle className="text-2xl text-gray-800">Prețuri *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="pricePerDay">Preț pe zi (RON) *</Label>
              <Input
                id="pricePerDay"
                type="number"
                min="1"
                value={formData.pricePerDay}
                onChange={(e) =>
                  updateFormData({ pricePerDay: e.target.value })
                }
                placeholder="150"
                className={`mt-1 ${validationErrors.pricePerDay ? "border-red-500" : ""}`}
              />
              {validationErrors.pricePerDay && (
                <p className="text-sm text-red-500 mt-1">
                  {validationErrors.pricePerDay}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="depositAmount">Garanția (RON)</Label>
              <Input
                id="depositAmount"
                type="number"
                min="0"
                value={formData.depositAmount}
                onChange={(e) =>
                  updateFormData({ depositAmount: e.target.value })
                }
                placeholder="500"
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Suma care va fi blocată ca garanție, dar restituită după
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Specifications */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <CardTitle className="text-2xl text-gray-800">
            Specificații tehnice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newSpecification}
              onChange={(e) => setNewSpecification(e.target.value)}
              placeholder="ex. 24.2 MP Full Frame"
              onKeyPress={(e) => e.key === "Enter" && addSpecification()}
            />
            <Button type="button" onClick={addSpecification} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.specifications.map((spec, index) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
              >
                <span>{spec}</span>
                <button
                  type="button"
                  onClick={() => removeSpecification(index)}
                  className="text-purple-600 hover:text-purple-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Included Items */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <CardTitle className="text-2xl text-gray-800">
            Ce include închirierea
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newIncludedItem}
              onChange={(e) => setNewIncludedItem(e.target.value)}
              placeholder="ex. Husă de transport"
              onKeyPress={(e) => e.key === "Enter" && addIncludedItem()}
            />
            <Button type="button" onClick={addIncludedItem} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.includedItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => removeIncludedItem(index)}
                  className="text-green-600 hover:text-green-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
