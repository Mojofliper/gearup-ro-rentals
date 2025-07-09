import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { LocationDetector } from './LocationDetector';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      
      if (mode === 'login') {
        if (!email || !password) {
          toast({
            title: 'Câmpuri obligatorii',
            description: 'Te rugăm să completezi emailul și parola.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        
        result = await login(email, password);
      } else {
        if (!email || !password || !fullName || !location) {
          toast({
            title: 'Câmpuri obligatorii',
            description: 'Te rugăm să completezi toate câmpurile obligatorii (email, parolă, nume complet, județ).',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        
        if (password.length < 6) {
          toast({
            title: 'Parolă prea scurtă',
            description: 'Parola trebuie să aibă cel puțin 6 caractere.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          toast({
            title: 'Email invalid',
            description: 'Te rugăm să introduci o adresă de email validă.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        
        if (phoneNumber && !/^(\+40|0)[0-9]{9}$/.test(phoneNumber.replace(/\s/g, ''))) {
          toast({
            title: 'Număr de telefon invalid',
            description: 'Te rugăm să introduci un număr de telefon românesc valid (ex: +40 7XX XXX XXX sau 07XX XXX XXX).',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        
        result = await signup(email, password, fullName, location, phoneNumber);
      }

      console.log('AuthModal: Result from auth function:', result);
      
      if (result && result.error) {
        console.log('AuthModal: Showing error toast:', result.error);
        toast({
          title: 'Eroare',
          description: result.error,
          variant: 'destructive',
        });
      } else if (result && result.error === undefined) {
        console.log('AuthModal: Showing success toast for mode:', mode);
        
        if (mode === 'login') {
          toast({
            title: 'Conectare reușită',
            description: 'Bun venit pe GearUp!',
          });
          onClose();
          resetForm();
          navigate('/browse');
        } else {
          // For signup, show success message and switch to login mode
          toast({
            title: 'Cont creat cu succes!',
            description: 'Contul tău a fost creat cu succes. Te poți conecta acum cu emailul și parola.',
          });
          
          // Switch to login mode and clear form
          onSwitchMode('login');
          resetForm();
        }
      }
    } catch (error) {
      console.error('Auth modal error:', error);
      toast({
        title: 'Eroare neașteptată',
        description: 'A apărut o eroare neașteptată. Te rugăm să încerci din nou sau să contactezi suportul.',
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
    setPhoneNumber('');
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error('Google sign-in error:', error);
        
        if (error.message.includes('popup_closed_by_user')) {
          toast({
            title: 'Conectare anulată',
            description: 'Fereastra de conectare Google a fost închisă. Te rugăm să încerci din nou.',
            variant: 'destructive',
          });
        } else if (error.message.includes('access_denied')) {
          toast({
            title: 'Acces refuzat',
            description: 'Ai refuzat accesul la contul Google. Te rugăm să accepți pentru a continua.',
            variant: 'destructive',
          });
        } else if (error.message.includes('network')) {
          toast({
            title: 'Eroare de rețea',
            description: 'Nu s-a putut conecta la Google. Verifică conexiunea la internet și încearcă din nou.',
            variant: 'destructive',
          });
        } else if (error.message.includes('timeout')) {
          toast({
            title: 'Timeout',
            description: 'Conectarea cu Google a durat prea mult. Te rugăm să încerci din nou.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Eroare la conectarea cu Google',
            description: error.message || 'Nu s-a putut conecta cu Google. Te rugăm să încerci din nou.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Google sign-in exception:', error);
      toast({
        title: 'Eroare neașteptată',
        description: 'A apărut o eroare neașteptată la conectarea cu Google. Te rugăm să încerci din nou.',
        variant: 'destructive',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {mode === 'login' ? 'Conectează-te' : 'Creează un cont'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === 'login' 
              ? 'Introdu emailul și parola pentru a te conecta la contul tău'
              : 'Completează informațiile pentru a crea un cont nou'
            }
          </DialogDescription>
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
                <Label htmlFor="phoneNumber">Număr de telefon (opțional)</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+40 7XX XXX XXX"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="location">Județul tău *</Label>
                <LocationDetector
                  onLocationChange={setLocation}
                  currentLocation={location}
                  className="mt-1"
                />
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

        <Separator className="my-4" />

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              'Se conectează...'
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuă cu Google
              </>
            )}
          </Button>
        </div>

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
