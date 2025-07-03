
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, User, MessageSquare, Camera, Menu, X, ShoppingBag } from 'lucide-react';

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
          <nav className="hidden md:flex items-center space-x-4">
            <Link to="/browse">
              <Button variant="ghost" className="text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-colors font-medium">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Închiriază echipament
              </Button>
            </Link>
            {user && (
              <Link to="/add-gear">
                <Button variant="ghost" className="text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-colors font-medium">
                  <Plus className="h-4 w-4 mr-2" />
                  Oferă spre închiriere
                </Button>
              </Link>
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <>
                <Link to="/messages">
                  <Button variant="ghost" size="sm" className="hover:bg-purple-50 hover:text-purple-600 transition-colors">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </Link>
                
                <Link to="/add-gear">
                  <Button className="btn-creative shadow-lg hover:shadow-xl transition-all duration-300" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Publică echipament
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

                <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-red-50 hover:text-red-600 transition-colors">
                  <User className="h-4 w-4 mr-2" />
                  Ieși din cont
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Button variant="ghost" size="sm" onClick={() => handleAuthClick('login')} className="hover:bg-purple-50 hover:text-purple-700 transition-colors">
                  <User className="h-4 w-4 mr-2" />
                  Conectează-te
                </Button>
                <Button className="btn-creative shadow-md hover:shadow-lg transition-all duration-300" size="sm" onClick={() => handleAuthClick('signup')}>
                  Înregistrează-te gratuit
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
                className="flex items-center space-x-2 text-gray-700 hover:text-purple-600 transition-colors p-2 rounded-lg hover:bg-purple-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Închiriază echipament</span>
              </Link>
              
              {user ? (
                <>
                  <Link 
                    to="/add-gear" 
                    className="flex items-center space-x-2 text-gray-700 hover:text-purple-600 transition-colors p-2 rounded-lg hover:bg-purple-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Oferă spre închiriere</span>
                  </Link>
                  <Link 
                    to="/messages" 
                    className="flex items-center space-x-2 text-gray-700 hover:text-purple-600 transition-colors p-2 rounded-lg hover:bg-purple-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Mesaje</span>
                  </Link>
                  <button 
                    onClick={handleProfileClick}
                    className="flex items-center space-x-2 w-full text-left text-gray-700 hover:text-purple-600 transition-colors p-2 rounded-lg hover:bg-purple-50"
                  >
                    <User className="h-4 w-4" />
                    <span>Profil</span>
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center space-x-2 w-full text-left text-gray-700 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
                  >
                    <User className="h-4 w-4" />
                    <span>Ieși din cont</span>
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start hover:bg-purple-50 hover:text-purple-700 transition-colors" 
                    onClick={() => handleAuthClick('login')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Conectează-te
                  </Button>
                  <Button 
                    className="w-full btn-creative shadow-md hover:shadow-lg transition-all duration-300" 
                    onClick={() => handleAuthClick('signup')}
                  >
                    Înregistrează-te gratuit
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
