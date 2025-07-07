import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserRow {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  is_verified?: boolean;
  created_at?: string;
}

export const UsersPanel: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filtered, setFiltered] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    const { data, error } = await supabase.from('users').select('id,email,full_name,role,is_verified,created_at');
    if (error) {
      console.error(error);
    } else {
      setUsers(data as unknown as UserRow[]);
      setFiltered(data as unknown as UserRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(users.filter(u => u.email.toLowerCase().includes(term) || (u.full_name?.toLowerCase().includes(term))));
  }, [search, users]);

  const toggleVerify = async (id: string, verified: boolean) => {
    const { error } = await supabase.from('users').update({ is_verified: verified }).eq('id', id);
    if (error) toast.error(error.message); else {
      toast.success('Status utilizator actualizat');
      loadUsers();
    }
  };

  const suspendUser = async (id: string) => {
    const { error } = await supabase.from('users').update({ role: 'suspended' }).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Utilizator suspendat'); loadUsers(); }
  };

  if (loading) return <div className="p-6 flex items-center"><Loader2 className="animate-spin mr-2"/>Loading users…</div>;

  return (
    <div>
      <div className="flex items-center mb-4">
        <Input placeholder="Search email or name" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Verified</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(user => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.full_name || '—'}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>{user.is_verified ? 'Yes' : 'No'}</TableCell>
              <TableCell className="space-x-2">
                <Button size="sm" variant="outline" onClick={() => toggleVerify(user.id, !user.is_verified)}>
                  {user.is_verified ? 'Revocă verificare' : 'Verifică'}
                </Button>
                {user.role !== 'suspended' ? (
                  <Button size="sm" variant="destructive" onClick={() => suspendUser(user.id)}>Suspendă</Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Suspendat</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}; 