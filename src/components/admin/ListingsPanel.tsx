import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
      const { data, error } = await supabase.from('gear').select('*').order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading gear:', error);
        toast.error('Eroare la încărcarea echipamentelor');
        setGear([]);
        return;
      }
      
      setGear(data as unknown as GearRow[]);
    } catch (error) {
      console.error('Error in loadGear:', error);
      toast.error('Eroare la încărcarea echipamentelor');
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
      const { error } = await supabase.from('gear').update({ status }).eq('id', id);
      
      if (error) {
        console.error('Error updating gear status:', error);
        toast.error('Eroare la actualizarea statusului');
        return;
      }
      
      toast.success('Echipament actualizat cu succes');
      loadGear();
    } catch (error) {
      console.error('Error in updateStatus:', error);
      toast.error('Eroare la actualizarea statusului');
    }
  };

  if (loading) return <div className="p-6 flex items-center"><Loader2 className="animate-spin mr-2"/>Loading listings…</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {gear.map(item => (
          <TableRow key={item.id}>
            <TableCell>{item.title}</TableCell>
            <TableCell>{item.status}</TableCell>
            <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
            <TableCell className="space-x-2">
              {item.status !== 'available' && (
                <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, 'available')}>Approve</Button>
              )}
              {item.status !== 'inactive' && (
                <Button size="sm" variant="destructive" onClick={() => updateStatus(item.id, 'inactive')}>Reject</Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}; 