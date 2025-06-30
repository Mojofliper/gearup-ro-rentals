
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
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let success = false;
      if (mode === 'login') {
        success = await login(email, password);
      } else {
        success = await signup(email, password, name, location);
      }

      if (success) {
        toast({
          title: mode === 'login' ? 'Conectare reușită' : 'Cont creat cu succes',
          description: mode === 'login' ? 'Bun venit pe GearUp!' : 'Poți începe să explorezi echipamentele disponibile.',
        });
        onClose();
        resetForm();
      } else {
        toast({
          title: 'Eroare',
          description: 'Verifică datele introduse și încearcă din nou.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'A apărut o eroare. Te rugăm să încerci din nou.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setLocation('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'login' ? 'Conectează-te' : 'Creează un cont'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <Label htmlFor="name">Nume complet</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ion Popescu"
                />
              </div>

              <div>
                <Label htmlFor="location">Orașul tău</Label>
                <Select value={location} onValueChange={setLocation} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectează orașul" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bucuresti">București</SelectItem>
                    <SelectItem value="cluj-napoca">Cluj-Napoca</SelectItem>
                    <SelectItem value="timisoara">Timișoara</SelectItem>
                    <SelectItem value="iasi">Iași</SelectItem>
                    <SelectItem value="constanta">Constanța</SelectItem>
                    <SelectItem value="brasov">Brașov</SelectItem>
                    <SelectItem value="craiova">Craiova</SelectItem>
                    <SelectItem value="galati">Galați</SelectItem>
                    <SelectItem value="ploiesti">Ploiești</SelectItem>
                    <SelectItem value="oradea">Oradea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="exemplu@email.com"
            />
          </div>

          <div>
            <Label htmlFor="password">Parolă</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Minim 6 caractere"
              minLength={6}
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
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === 'login' ? 'Nu ai cont? Înregistrează-te' : 'Ai deja cont? Conectează-te'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
