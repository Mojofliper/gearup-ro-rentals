import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format } from 'date-fns';

interface SeriesPoint { x: string; y: number; }

export const AnalyticsPanel: React.FC = () => {
  const [revenue, setRevenue] = useState<SeriesPoint[]>([]);
  const [users, setUsers] = useState<SeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Load escrow transactions (released)
      const { data: tx } = await supabase
        .from('escrow_transactions')
        .select('rental_amount, created_at')
        .eq('escrow_status', 'released');
      if (tx) {
        const map: Record<string, number> = {};
        tx.forEach((t: any) => {
          const month = format(new Date(t.created_at), 'yyyy-MM');
          map[month] = (map[month] || 0) + (t.rental_amount as number);
        });
        setRevenue(Object.entries(map).map(([m, v]) => ({ x: m, y: v })));
      }
      // Load users
      const { data: us } = await supabase
        .from('users')
        .select('created_at');
      if (us) {
        const m: Record<string, number> = {};
        us.forEach((u: any) => {
          const month = format(new Date(u.created_at), 'yyyy-MM');
          m[month] = (m[month] || 0) + 1;
        });
        setUsers(Object.entries(m).map(([mo, c]) => ({ x: mo, y: c })));
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="p-6 flex items-center"><Loader2 className="animate-spin mr-2"/>Loading analytics…</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle>Venit lunar (RON)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenue} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="y" stroke="#8844ee" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Utilizatori noi / lună</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={users} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="y" stroke="#22c55e" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}; 