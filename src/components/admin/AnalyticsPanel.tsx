import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, DollarSign } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { format } from "date-fns";

interface SeriesPoint {
  x: string;
  y: number;
}

export const AnalyticsPanel: React.FC = () => {
  const [revenue, setRevenue] = useState<SeriesPoint[]>([]);
  const [users, setUsers] = useState<SeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        // Load escrow transactions (released) - handle if table doesn't exist
        let revenue: SeriesPoint[] = [];
        try {
          const { data: tx } = await supabase
            .from("escrow_transactions")
            .select("rental_amount, created_at")
            .eq("escrow_status", "released");

          if (tx) {
            const map: Record<string, number> = {};
            tx.forEach((t: Record<string, unknown>) => {
              const month = format(new Date(t.created_at as string), "yyyy-MM");
              map[month] = (map[month] || 0) + (t.rental_amount as number);
            });
            revenue = Object.entries(map).map(([m, v]) => ({ x: m, y: v }));
          }
        } catch (error) {
          console.log("Escrow transactions table not available:", error);
          revenue = [];
        }
        setRevenue(revenue);

        // Load users
        let users: SeriesPoint[] = [];
        try {
          const { data: us } = await supabase
            .from("users")
            .select("created_at");

          if (us) {
            const m: Record<string, number> = {};
            us.forEach((u: Record<string, unknown>) => {
              const month = format(new Date(u.created_at as string), "yyyy-MM");
              m[month] = (m[month] || 0) + 1;
            });
            users = Object.entries(m).map(([mo, c]) => ({ x: mo, y: c }));
          }
        } catch (error) {
          console.log("Users table not available:", error);
          users = [];
        }
        setUsers(users);
      } catch (error) {
        console.error("Error loading analytics:", error);
        setRevenue([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-gray-600">Se încarcă analiticele...</p>
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
            Analytics & Rapoarte
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Statistici și tendințe platformă
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span>Venit lunar (RON)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenue.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-4">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto" />
                  <p className="text-gray-600">Nu există date de venit</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={revenue}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke="#22c55e"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
              <Users className="h-5 w-5 text-blue-600" />
              <span>Utilizatori noi / lună</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-4">
                  <Users className="h-12 w-12 text-gray-400 mx-auto" />
                  <p className="text-gray-600">Nu există date de utilizatori</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={users}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Venit Total</p>
                <p className="text-xl font-bold text-gray-900">
                  {revenue
                    .reduce((sum, item) => sum + item.y, 0)
                    .toLocaleString()}{" "}
                  RON
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Utilizatori Total
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {users.reduce((sum, item) => sum + item.y, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Luni Active</p>
                <p className="text-xl font-bold text-gray-900">
                  {Math.max(revenue.length, users.length)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Medie Venit/Lună
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {revenue.length > 0
                    ? (
                        revenue.reduce((sum, item) => sum + item.y, 0) /
                        revenue.length
                      ).toFixed(0)
                    : 0}{" "}
                  RON
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
