import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AuthModal } from '@/components/AuthModal';
import { Cart } from '@/components/Cart';
import { Checkout } from '@/components/Checkout';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, User, MessageSquare, Camera, Menu, X, ShoppingBag } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

export const Header: React.FC<{ unreadCount?: number }> = ({ unreadCount }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [checkoutItems, setCheckoutItems] = useState<any[]>([]);
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
    navigate('/');
  };

  useEffect(() => {
    const updateCartCount = () => {
      const savedCart = localStorage.getItem('gearup-cart');
      if (savedCart) {
        try {
          const cartItems = JSON.parse(savedCart);
          setCartItemCount(cartItems.length);
        } catch (error) {
          setCartItemCount(0);
        }
      } else {
        setCartItemCount(0);
      }
    };

    updateCartCount();
    
    window.addEventListener('storage', updateCartCount);
    const handleCartUpdate = () => updateCartCount();
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  const handleCheckout = (cartItems: any[]) => {
    setCheckoutItems(cartItems);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleCheckoutSuccess = () => {
    setIsCheckoutOpen(false);
    setCartItemCount(0);
    navigate('/profile');
  };

  const avatarUrl = profile?.avatar_url 
    ? profile.avatar_url.startsWith('http') 
      ? profile.avatar_url 
      : `https://wnrbxwzeshgblkfidayb.supabase.co/storage/v1/object/public/avatars/${profile.avatar_url}`
    : '';

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
          <Link to={user ? "/browse" : "/"} className="flex items-center">
            <img 
              src="/lovable-uploads/81ffbf32-0e06-4641-b110-f9aec3ae32c7.png" 
              alt="GearUp" 
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <>
                <Link to="/messages">
                  <Button variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-blue-600 transition-colors relative">
                    <MessageSquare className="h-4 w-4" />
                    {unreadCount && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">{unreadCount}</span>
                    )}
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCartOpen(true)}
                  className="hover:bg-blue-50 hover:text-blue-600 transition-colors relative"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>

                {/* Avatar + Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-8 w-8 cursor-pointer">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {profile?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleProfileClick}>
                      Profil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-700">
                      Ieși din cont
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {profile?.is_verified && (
                  <Badge variant="secondary" className="text-xs">
                    Verificat
                  </Badge>
                )}
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Button variant="ghost" size="sm" onClick={() => handleAuthClick('login')} className="hover:bg-blue-50 hover:text-blue-700 transition-colors">
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
              {user ? (
                <>
                  <Link 
                    to="/messages" 
                    className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Mesaje</span>
                  </Link>
                  <button 
                    onClick={handleProfileClick}
                    className="flex items-center space-x-2 w-full text-left text-gray-700 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50"
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
                    className="w-full justify-start hover:bg-blue-50 hover:text-blue-700 transition-colors" 
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

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={handleCheckout}
      />

      <Checkout
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={checkoutItems}
        onSuccess={handleCheckoutSuccess}
      />
    </>
  );
};
