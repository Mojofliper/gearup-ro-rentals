
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, mode, onSwitchMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (mode === 'login') {
        result = await login(email, password);
      } else {
        if (!fullName || !location) {
          toast({
            title: 'Eroare',
            description: 'Te rugăm să completezi toate câmpurile.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        result = await signup(email, password, fullName, location);
      }

      if (!result.error) {
        toast({
          title: mode === 'login' ? 'Conectare reușită' : 'Cont creat cu succes',
          description: mode === 'login' 
            ? 'Bun venit pe GearUp!' 
            : 'Verifică-ți emailul pentru a confirma contul.',
        });
        onClose();
        resetForm();
      } else {
        toast({
          title: 'Eroare',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'A apărut o eroare neașteptată. Te rugăm să încerci din nou.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setLocation('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {mode === 'login' ? 'Conectează-te' : 'Creează un cont'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <Label htmlFor="fullName">Nume complet *</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Ion Popescu"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="location">Orașul tău *</Label>
                <Select value={location} onValueChange={setLocation} required>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selectează orașul" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="București">București</SelectItem>
                    <SelectItem value="Cluj-Napoca">Cluj-Napoca</SelectItem>
                    <SelectItem value="Timișoara">Timișoara</SelectItem>
                    <SelectItem value="Iași">Iași</SelectItem>
                    <SelectItem value="Constanța">Constanța</SelectItem>
                    <SelectItem value="Brașov">Brașov</SelectItem>
                    <SelectItem value="Craiova">Craiova</SelectItem>
                    <SelectItem value="Galați">Galați</SelectItem>
                    <SelectItem value="Ploiești">Ploiești</SelectItem>
                    <SelectItem value="Oradea">Oradea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="exemplu@email.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password">Parolă *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Minim 6 caractere"
              minLength={6}
              className="mt-1"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Se procesează...' : (mode === 'login' ? 'Conectează-te' : 'Creează contul')}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => onSwitchMode(mode === 'login' ? 'signup' : 'login')}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {mode === 'login' ? 'Nu ai cont? Înregistrează-te' : 'Ai deja cont? Conectează-te'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
