import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Loader2,
  Package,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface GearRow {
  id: string;
  title: string;
  owner_id: string;
  status: string;
  created_at: string;
}

export const ListingsPanel: React.FC = () => {
  const [gear, setGear] = useState<GearRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGear = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("gear")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading gear:", error);
        toast.error("Eroare la încărcarea echipamentelor");
        setGear([]);
        return;
      }

      setGear(data as unknown as GearRow[]);
    } catch (error) {
      console.error("Error in loadGear:", error);
      toast.error("Eroare la încărcarea echipamentelor");
      setGear([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGear();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("gear")
        .update({ status })
        .eq("id", id);

      if (error) {
        console.error("Error updating gear status:", error);
        toast.error("Eroare la actualizarea statusului");
        return;
      }

      toast.success("Echipament actualizat cu succes");
      loadGear();
    } catch (error) {
      console.error("Error in updateStatus:", error);
      toast.error("Eroare la actualizarea statusului");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: {
        label: "Disponibil",
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
      },
      inactive: {
        label: "Inactiv",
        color: "bg-red-100 text-red-800",
        icon: XCircle,
      },
      pending: {
        label: "În așteptare",
        color: "bg-yellow-100 text-yellow-800",
        icon: Eye,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-gray-600">Se încarcă echipamentele...</p>
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
            Gestionare Echipamente
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Administrează echipamentele platformei
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadGear}
            className="rounded-xl"
          >
            <Loader2 className="h-4 w-4 mr-2" />
            Reîmprospătare
          </Button>
        </div>
      </div>

      {/* Listings Table - Mobile Card Layout */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            Echipamente ({gear.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gear.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nu există echipamente
              </h3>
              <p className="text-gray-600">
                Nu au fost găsite echipamente în sistem.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Echipament</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data creării</TableHead>
                      <TableHead>Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gear.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Package className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{item.title}</p>
                              <p className="text-sm text-gray-500">
                                ID: {item.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">
                              {format(
                                new Date(item.created_at),
                                "dd MMM yyyy",
                                { locale: ro },
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {item.status !== "available" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateStatus(item.id, "available")
                                }
                                className="rounded-lg"
                              >
                                Aprobă
                              </Button>
                            )}
                            {item.status !== "inactive" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  updateStatus(item.id, "inactive")
                                }
                                className="rounded-lg"
                              >
                                Respinge
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Layout */}
              <div className="lg:hidden space-y-4">
                {gear.map((item) => (
                  <Card key={item.id} className="rounded-xl">
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {/* Gear Info */}
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-base">
                              {item.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              ID: {item.id.slice(0, 8)}
                            </p>
                          </div>
                          {getStatusBadge(item.status)}
                        </div>

                        {/* Additional Info */}
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(item.created_at), "dd MMM yyyy", {
                              locale: ro,
                            })}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                          {item.status !== "available" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(item.id, "available")}
                              className="flex-1 rounded-xl"
                            >
                              Aprobă
                            </Button>
                          )}
                          {item.status !== "inactive" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateStatus(item.id, "inactive")}
                              className="flex-1 rounded-xl"
                            >
                              Respinge
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
