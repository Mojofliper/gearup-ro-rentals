
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, User, MessageSquare, Camera, Menu, X } from 'lucide-react';

export const Header: React.FC = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, logout, loading } = useAuth();
  const navigate = useNavigate();

  const handleAuthClick = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 font-bold text-xl">
            <Camera className="h-6 w-6 text-purple-600" />
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              GearUp
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/browse" className="text-gray-700 hover:text-purple-600 transition-colors">
              Închiriază
            </Link>
            {user && (
              <Link to="/add-gear" className="text-gray-700 hover:text-purple-600 transition-colors">
                Oferă spre închiriere
              </Link>
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <>
                <Link to="/messages">
                  <Button variant="ghost" size="sm">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </Link>
                
                <Link to="/add-gear">
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Adaugă
                  </Button>
                </Link>

                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8 cursor-pointer" onClick={handleProfileClick}>
                    <AvatarFallback className="bg-purple-100 text-purple-600">
                      {profile?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {profile?.is_verified && (
                    <Badge variant="secondary" className="text-xs">
                      Verificat
                    </Badge>
                  )}
                </div>

                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Ieși
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={() => handleAuthClick('login')}>
                  Conectează-te
                </Button>
                <Button size="sm" onClick={() => handleAuthClick('signup')}>
                  Înregistrează-te
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="container mx-auto px-4 py-4 space-y-4">
              <Link 
                to="/browse" 
                className="block text-gray-700 hover:text-purple-600 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Închiriază
              </Link>
              
              {user ? (
                <>
                  <Link 
                    to="/add-gear" 
                    className="block text-gray-700 hover:text-purple-600 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Oferă spre închiriere
                  </Link>
                  <Link 
                    to="/messages" 
                    className="block text-gray-700 hover:text-purple-600 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Mesaje
                  </Link>
                  <button 
                    onClick={handleProfileClick}
                    className="block w-full text-left text-gray-700 hover:text-purple-600 transition-colors"
                  >
                    Profil
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="block w-full text-left text-gray-700 hover:text-purple-600 transition-colors"
                  >
                    Ieși din cont
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start" 
                    onClick={() => handleAuthClick('login')}
                  >
                    Conectează-te
                  </Button>
                  <Button 
                    className="w-full" 
                    onClick={() => handleAuthClick('signup')}
                  >
                    Înregistrează-te
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={setAuthMode}
      />
    </>
  );
};
