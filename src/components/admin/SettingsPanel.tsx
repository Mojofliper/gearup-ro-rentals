import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface PlatformSetting {
  setting_key: string;
  setting_value: string;
  description?: string;
}

export const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .order("setting_key");

      if (error) {
        console.log("Platform settings table not available:", error);
        // Use default settings if table doesn't exist
        const defaultSettings = [
          { setting_key: "platform_fee_percentage", setting_value: "10" },
          { setting_key: "escrow_hold_days", setting_value: "3" },
          { setting_key: "max_rental_days", setting_value: "30" },
          { setting_key: "min_deposit_percentage", setting_value: "20" },
          { setting_key: "auto_approval_threshold", setting_value: "4.5" },
          { setting_key: "support_email", setting_value: "support@gearup.ro" },
        ];
        setSettings(defaultSettings);

        // Initialize edited settings
        const initialEdited: Record<string, string> = {};
        defaultSettings.forEach((setting) => {
          initialEdited[setting.setting_key] = setting.setting_value;
        });
        setEditedSettings(initialEdited);
        return;
      }

      setSettings(data || []);

      // Initialize edited settings
      const initialEdited: Record<string, string> = {};
      (data || []).forEach((setting) => {
        initialEdited[setting.setting_key] = setting.setting_value;
      });
      setEditedSettings(initialEdited);
    } catch (error: unknown) {
      console.error("Error loading settings:", error);
      toast.error("Eroare la încărcarea setărilor");

      // Use default settings on error
      const defaultSettings = [
        { setting_key: "platform_fee_percentage", setting_value: "10" },
        { setting_key: "escrow_hold_days", setting_value: "3" },
        { setting_key: "max_rental_days", setting_value: "30" },
        { setting_key: "min_deposit_percentage", setting_value: "20" },
        { setting_key: "auto_approval_threshold", setting_value: "4.5" },
        { setting_key: "support_email", setting_value: "support@gearup.ro" },
      ];
      setSettings(defaultSettings);

      const initialEdited: Record<string, string> = {};
      defaultSettings.forEach((setting) => {
        initialEdited[setting.setting_key] = setting.setting_value;
      });
      setEditedSettings(initialEdited);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setEditedSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(editedSettings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("platform_settings")
        .upsert(updates, { onConflict: "setting_key" });

      if (error) {
        console.log("Platform settings table not available for saving:", error);
        toast.success(
          "Setările au fost actualizate local! (Tabelul nu este disponibil)",
        );
        return;
      }

      toast.success("Setările au fost salvate cu succes!");
      await loadSettings(); // Reload to get updated data
    } catch (error: unknown) {
      console.error("Error saving settings:", error);
      toast.error("Eroare la salvarea setărilor");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (
      !confirm(
        "Ești sigur că vrei să resetezi toate setările la valorile implicite?",
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const defaultSettings = [
        { setting_key: "platform_fee_percentage", setting_value: "10" },
        { setting_key: "escrow_hold_days", setting_value: "3" },
        { setting_key: "max_rental_days", setting_value: "30" },
        { setting_key: "min_deposit_percentage", setting_value: "20" },
        { setting_key: "auto_approval_threshold", setting_value: "4.5" },
        { setting_key: "support_email", setting_value: "support@gearup.ro" },
      ];

      const { error } = await supabase
        .from("platform_settings")
        .upsert(defaultSettings, { onConflict: "setting_key" });

      if (error) {
        console.log("Platform settings table not available for reset:", error);
        toast.success(
          "Setările au fost resetate local! (Tabelul nu este disponibil)",
        );
        setSettings(defaultSettings);

        const initialEdited: Record<string, string> = {};
        defaultSettings.forEach((setting) => {
          initialEdited[setting.setting_key] = setting.setting_value;
        });
        setEditedSettings(initialEdited);
        return;
      }

      toast.success("Setările au fost resetate la valorile implicite!");
      await loadSettings();
    } catch (error: unknown) {
      console.error("Error resetting settings:", error);
      toast.error("Eroare la resetarea setărilor");
    } finally {
      setSaving(false);
    }
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      platform_fee_percentage:
        "Procentul din închiriere pe care îl păstrează platforma",
      escrow_hold_days:
        "Numărul de zile în care fondurile rămân în escrow după finalizarea închirierii",
      max_rental_days: "Numărul maxim de zile pentru o singură închiriere",
      min_deposit_percentage:
        "Procentul minim de depozit față de valoarea echipamentului",
      auto_approval_threshold:
        "Ratingul minim pentru aprobarea automată a rezervărilor",
      support_email: "Adresa de email pentru suportul clienților",
    };
    return descriptions[key] || "Setare platformă";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-gray-600">Se încarcă setările...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Setări Platformă
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Configurează parametrii platformei
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            disabled={saving}
            className="rounded-xl"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Resetare Implicit
          </Button>
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="rounded-xl"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Se salvează...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvează Setările
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.map((setting) => (
          <Card key={setting.setting_key} className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">
                {getSettingDescription(setting.setting_key)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor={setting.setting_key}
                  className="text-sm font-medium"
                >
                  {setting.setting_key
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </Label>

                {setting.setting_key === "support_email" ? (
                  <Input
                    id={setting.setting_key}
                    type="email"
                    value={editedSettings[setting.setting_key] || ""}
                    onChange={(e) =>
                      handleSettingChange(setting.setting_key, e.target.value)
                    }
                    className="rounded-xl"
                    placeholder="support@gearup.ro"
                  />
                ) : setting.setting_key.includes("percentage") ||
                  setting.setting_key.includes("threshold") ? (
                  <Input
                    id={setting.setting_key}
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editedSettings[setting.setting_key] || ""}
                    onChange={(e) =>
                      handleSettingChange(setting.setting_key, e.target.value)
                    }
                    className="rounded-xl"
                    placeholder="0"
                  />
                ) : setting.setting_key.includes("days") ? (
                  <Input
                    id={setting.setting_key}
                    type="number"
                    min="1"
                    max="365"
                    value={editedSettings[setting.setting_key] || ""}
                    onChange={(e) =>
                      handleSettingChange(setting.setting_key, e.target.value)
                    }
                    className="rounded-xl"
                    placeholder="1"
                  />
                ) : (
                  <Input
                    id={setting.setting_key}
                    type="text"
                    value={editedSettings[setting.setting_key] || ""}
                    onChange={(e) =>
                      handleSettingChange(setting.setting_key, e.target.value)
                    }
                    className="rounded-xl"
                    placeholder="Valoare"
                  />
                )}

                <p className="text-xs text-gray-500">
                  {getSettingDescription(setting.setting_key)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Warning Card */}
      <Card className="rounded-xl border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-900">Atenție</h3>
              <p className="text-sm text-orange-700 mt-1">
                Modificarea acestor setări poate afecta funcționarea platformei.
                Asigură-te că înțelegi impactul fiecărei modificări înainte de a
                salva.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
