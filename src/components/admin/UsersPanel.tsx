import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  Loader2, Search, Filter, UserCheck, UserX, Shield, 
  Mail, Calendar, MapPin, Star, Eye, Edit, Trash2,
  RefreshCw, Download, Upload, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface UserRow {
  id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_verified?: boolean;
  is_suspended?: boolean;
  location?: string;
  rating?: number;
  total_reviews?: number;
  created_at?: string;
  updated_at?: string;
  avatar_url?: string;
}

export const UsersPanel: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filtered, setFiltered] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified' | 'suspended' | 'admin'>('all');
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    unverified: 0,
    suspended: 0,
    admins: 0,
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error);
        toast.error('Eroare la încărcarea utilizatorilor');
        return;
      }

      const usersData = data as UserRow[];
      setUsers(usersData);
      setFiltered(usersData);

      // Calculate stats
      const stats = {
        total: usersData.length,
        verified: usersData.filter(u => u.is_verified).length,
        unverified: usersData.filter(u => !u.is_verified).length,
        suspended: usersData.filter(u => u.is_suspended).length,
        admins: usersData.filter(u => u.role === 'admin').length,
      };
      setStats(stats);

    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Eroare la încărcarea utilizatorilor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    let filteredUsers = users;

    // Apply search filter
    if (search) {
      const term = search.toLowerCase();
      filteredUsers = filteredUsers.filter(u => 
        u.email.toLowerCase().includes(term) || 
        (u.full_name?.toLowerCase().includes(term)) ||
        (u.first_name?.toLowerCase().includes(term)) ||
        (u.last_name?.toLowerCase().includes(term))
      );
    }

    // Apply role/status filter
    switch (filter) {
      case 'verified':
        filteredUsers = filteredUsers.filter(u => u.is_verified);
        break;
      case 'unverified':
        filteredUsers = filteredUsers.filter(u => !u.is_verified);
        break;
      case 'suspended':
        filteredUsers = filteredUsers.filter(u => u.is_suspended);
        break;
      case 'admin':
        filteredUsers = filteredUsers.filter(u => u.role === 'admin');
        break;
      default:
        break;
    }

    setFiltered(filteredUsers);
  }, [search, filter, users]);

  const toggleVerify = async (id: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_verified: verified })
        .eq('id', id);

      if (error) {
        toast.error('Eroare la actualizarea statusului');
        return;
      }

      toast.success(`Utilizator ${verified ? 'verificat' : 'neverificat'} cu succes`);
      loadUsers(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Eroare la actualizarea utilizatorului');
    }
  };

  const toggleSuspend = async (id: string, suspended: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_suspended: suspended })
        .eq('id', id);

      if (error) {
        toast.error('Eroare la actualizarea statusului');
        return;
      }

      toast.success(`Utilizator ${suspended ? 'suspendat' : 'reactivat'} cu succes`);
      loadUsers(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Eroare la actualizarea utilizatorului');
    }
  };

  const changeRole = async (id: string, role: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', id);

      if (error) {
        toast.error('Eroare la schimbarea rolului');
        return;
      }

      toast.success(`Rol schimbat cu succes`);
      loadUsers(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Eroare la schimbarea rolului');
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Ești sigur că vrei să ștergi acest utilizator? Această acțiune nu poate fi anulată.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Eroare la ștergerea utilizatorului');
        return;
      }

      toast.success('Utilizator șters cu succes');
      loadUsers(); // Reload to get updated data
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Eroare la ștergerea utilizatorului');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-gray-600">Se încarcă utilizatorii...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gestionare Utilizatori</h2>
          <p className="text-gray-600 text-sm sm:text-base">Administrează utilizatorii platformei</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={loadUsers} className="rounded-xl">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reîmprospătare
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Verificați</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.verified}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserX className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Neverificați</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.unverified}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Admini</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.admins}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserX className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Suspendati</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.suspended}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Caută după nume sau email..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className="rounded-xl"
              >
                Toți ({stats.total})
              </Button>
              <Button
                variant={filter === 'verified' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('verified')}
                className="rounded-xl"
              >
                Verificați ({stats.verified})
              </Button>
              <Button
                variant={filter === 'unverified' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unverified')}
                className="rounded-xl"
              >
                Neverificați ({stats.unverified})
              </Button>
              <Button
                variant={filter === 'admin' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('admin')}
                className="rounded-xl"
              >
                Admini ({stats.admins})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table - Mobile Card Layout */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Utilizatori ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizator</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Locație</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data înregistrării</TableHead>
                  <TableHead>Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name || 'Necunoscut'}</p>
                          <p className="text-sm text-gray-500">{user.role || 'user'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">{user.location || 'Necunoscut'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-400" />
                        <span className="text-sm">{user.rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-xs text-gray-500">({user.total_reviews || 0})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {user.is_verified && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Verificat
                          </Badge>
                        )}
                        {user.is_suspended && (
                          <Badge variant="destructive">
                            <UserX className="h-3 w-3 mr-1" />
                            Suspendat
                          </Badge>
                        )}
                        {user.role === 'admin' && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">
                          {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: ro }) : 'Necunoscut'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleVerify(user.id, !user.is_verified)}
                          className="h-7 px-2 rounded-lg"
                        >
                          {user.is_verified ? 'Revocă' : 'Verifică'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleSuspend(user.id, !user.is_suspended)}
                          className="h-7 px-2 rounded-lg"
                        >
                          {user.is_suspended ? 'Reactivează' : 'Suspendă'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => changeRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                          className="h-7 px-2 rounded-lg"
                        >
                          {user.role === 'admin' ? 'Elimină Admin' : 'Fă Admin'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteUser(user.id)}
                          className="h-7 px-2 rounded-lg"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card Layout */}
          <div className="lg:hidden space-y-4">
            {filtered.map(user => (
              <Card key={user.id} className="rounded-xl">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* User Info */}
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-base">{user.full_name || 'Necunoscut'}</p>
                        <p className="text-sm text-gray-500">{user.role || 'user'}</p>
                        <div className="flex items-center space-x-1 mt-1">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-gray-600">{user.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span>{user.location || 'Necunoscut'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-400" />
                        <span>{user.rating?.toFixed(1) || '0.0'} ({user.total_reviews || 0})</span>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {user.is_verified && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Verificat
                        </Badge>
                      )}
                      {user.is_suspended && (
                        <Badge variant="destructive">
                          <UserX className="h-3 w-3 mr-1" />
                          Suspendat
                        </Badge>
                      )}
                      {user.role === 'admin' && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>

                    {/* Registration Date */}
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: ro }) : 'Necunoscut'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleVerify(user.id, !user.is_verified)}
                        className="flex-1 rounded-xl"
                      >
                        {user.is_verified ? 'Revocă' : 'Verifică'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleSuspend(user.id, !user.is_suspended)}
                        className="flex-1 rounded-xl"
                      >
                        {user.is_suspended ? 'Reactivează' : 'Suspendă'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => changeRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                        className="flex-1 rounded-xl"
                      >
                        {user.role === 'admin' ? 'Elimină Admin' : 'Fă Admin'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteUser(user.id)}
                        className="flex-1 rounded-xl"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Șterge
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 