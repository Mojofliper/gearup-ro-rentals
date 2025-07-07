import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface PlatformSetting {
  setting_key: string;
  setting_value: string;
  description?: string;
}

export const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      setSettings(data || []);
      
      // Initialize edited settings
      const initialEdited: Record<string, string> = {};
      (data || []).forEach(setting => {
        initialEdited[setting.setting_key] = setting.setting_value;
      });
      setEditedSettings(initialEdited);
    } catch (error: any) {
      toast.error('Eroare la încărcarea setărilor: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setEditedSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(editedSettings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('platform_settings')
        .upsert(updates, { onConflict: 'setting_key' });

      if (error) throw error;
      
      toast.success('Setările au fost salvate cu succes!');
      await loadSettings(); // Reload to get updated data
    } catch (error: any) {
      toast.error('Eroare la salvarea setărilor: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('Ești sigur că vrei să resetezi toate setările la valorile implicite?')) {
      return;
    }

    setSaving(true);
    try {
      const defaultSettings = [
        { setting_key: 'platform_fee_percentage', setting_value: '10' },
        { setting_key: 'escrow_hold_days', setting_value: '3' },
        { setting_key: 'max_rental_days', setting_value: '30' },
        { setting_key: 'min_deposit_percentage', setting_value: '20' },
        { setting_key: 'auto_approval_threshold', setting_value: '4.5' },
        { setting_key: 'support_email', setting_value: 'support@gearup.ro' }
      ];

      const { error } = await supabase
        .from('platform_settings')
        .upsert(defaultSettings, { onConflict: 'setting_key' });

      if (error) throw error;
      
      toast.success('Setările au fost resetate la valorile implicite!');
      await loadSettings();
    } catch (error: any) {
      toast.error('Eroare la resetarea setărilor: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      platform_fee_percentage: 'Procentul din închiriere pe care îl păstrează platforma',
      escrow_hold_days: 'Numărul de zile în care fondurile rămân în escrow după finalizarea închirierii',
      max_rental_days: 'Numărul maxim de zile pentru o singură închiriere',
      min_deposit_percentage: 'Procentul minim de depozit față de valoarea echipamentului',
      auto_approval_threshold: 'Ratingul minim pentru aprobarea automată a rezervărilor',
      support_email: 'Adresa de email pentru suportul clienților'
    };
    return descriptions[key] || 'Setare platformă';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Se încarcă setările...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Setări Platformă</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={resetToDefaults} disabled={saving}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Resetare Implicit
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvează Setările
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Fees */}
        <Card>
          <CardHeader>
            <CardTitle>Taxe Platformă</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="platform_fee_percentage">Taxă Platformă (%)</Label>
              <Input
                id="platform_fee_percentage"
                type="number"
                min="0"
                max="50"
                value={editedSettings.platform_fee_percentage || ''}
                onChange={(e) => handleSettingChange('platform_fee_percentage', e.target.value)}
                placeholder="10"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {getSettingDescription('platform_fee_percentage')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Escrow Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Setări Escrow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="escrow_hold_days">Zile Retenție Escrow</Label>
              <Input
                id="escrow_hold_days"
                type="number"
                min="1"
                max="30"
                value={editedSettings.escrow_hold_days || ''}
                onChange={(e) => handleSettingChange('escrow_hold_days', e.target.value)}
                placeholder="3"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {getSettingDescription('escrow_hold_days')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rental Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Limitări Închiriere</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="max_rental_days">Zile Maxime Închiriere</Label>
              <Input
                id="max_rental_days"
                type="number"
                min="1"
                max="365"
                value={editedSettings.max_rental_days || ''}
                onChange={(e) => handleSettingChange('max_rental_days', e.target.value)}
                placeholder="30"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {getSettingDescription('max_rental_days')}
              </p>
            </div>
            <div>
              <Label htmlFor="min_deposit_percentage">Depozit Minim (%)</Label>
              <Input
                id="min_deposit_percentage"
                type="number"
                min="0"
                max="100"
                value={editedSettings.min_deposit_percentage || ''}
                onChange={(e) => handleSettingChange('min_deposit_percentage', e.target.value)}
                placeholder="20"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {getSettingDescription('min_deposit_percentage')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Approval Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Aprobare Automată</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="auto_approval_threshold">Rating Minim Aprobare</Label>
              <Input
                id="auto_approval_threshold"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={editedSettings.auto_approval_threshold || ''}
                onChange={(e) => handleSettingChange('auto_approval_threshold', e.target.value)}
                placeholder="4.5"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {getSettingDescription('auto_approval_threshold')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Support Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Suport Clienți</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="support_email">Email Suport</Label>
              <Input
                id="support_email"
                type="email"
                value={editedSettings.support_email || ''}
                onChange={(e) => handleSettingChange('support_email', e.target.value)}
                placeholder="support@gearup.ro"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {getSettingDescription('support_email')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              <strong>Atenție:</strong> Modificarea acestor setări poate afecta funcționarea platformei. 
              Asigură-te că înțelegi impactul înainte de a salva modificările.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 