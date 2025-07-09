import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AuthModal } from '@/components/AuthModal';
import { Cart } from '@/components/Cart';
import { Checkout } from '@/components/Checkout';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Search, Plus, User, MessageSquare, Camera, Menu, X, ShoppingBag, 
  Shield, Bell, Compass, Star, Home, Package, Settings, LogOut,
  ChevronDown, Sparkles
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from './NotificationBell';

interface CartItem {
  id: string;
  gear: {
    id: string;
    title: string;
    price_per_day: number;
    deposit_amount: number;
    gear_photos: Array<Record<string, unknown>>;
    owner: {
      id: string;
      full_name: string;
      location: string;
      is_verified: boolean;
    };
  };
  selectedDates: Date[];
  notes: string;
}

export const Header: React.FC<{ unreadCount?: number }> = ({ unreadCount }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleAuthClick = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
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

  const handleCheckout = (cartItems: CartItem[]) => {
    setCheckoutItems(cartItems);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleCheckoutSuccess = () => {
    setIsCheckoutOpen(false);
    setCartItemCount(0);
    navigate('/dashboard');
  };

  const avatarUrl = profile?.avatar_url 
    ? profile.avatar_url.startsWith('http') 
      ? profile.avatar_url 
      : `https://wnrbxwzeshgblkfidayb.supabase.co/storage/v1/object/public/avatars/${profile.avatar_url}`
    : '';

  const isActiveRoute = (path: string) => location.pathname === path;

  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/50 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo skeleton */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg animate-pulse"></div>
            <div className="hidden sm:block">
              <div className="w-16 h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Navigation skeleton */}
          <div className="hidden lg:flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-20 h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-md animate-pulse"></div>
              ))}
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-pulse"></div>
              <div className="w-8 h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-pulse"></div>
              <div className="w-8 h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Mobile menu skeleton */}
          <div className="lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-md animate-pulse"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/50 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo Section */}
          <Link to="/" className="flex items-center group">
            <div className="relative">
              <img 
                src="/lovable-uploads/81ffbf32-0e06-4641-b110-f9aec3ae32c7.png" 
                alt="GearUp" 
                className="h-8 w-auto transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {user ? (
              <>
                {/* Main Navigation */}
                <nav className="flex items-center space-x-1 mr-4">
                  <Link to="/browse">
                    <Button 
                      variant={isActiveRoute('/browse') ? "default" : "ghost"} 
                      size="sm" 
                      className={`relative transition-all duration-200 ${
                        isActiveRoute('/browse') 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                          : 'hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <Compass className="h-4 w-4 mr-2" />
                      Caută
                      {isActiveRoute('/browse') && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                      )}
                    </Button>
                  </Link>

                  <Link to="/dashboard">
                    <Button 
                      variant={isActiveRoute('/dashboard') ? "default" : "ghost"} 
                      size="sm" 
                      className={`relative transition-all duration-200 ${
                        isActiveRoute('/dashboard') 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                          : 'hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Dashboard
                      {isActiveRoute('/dashboard') && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                      )}
                    </Button>
                  </Link>

                  <Link to="/messages">
                    <Button 
                      variant={isActiveRoute('/messages') ? "default" : "ghost"} 
                      size="sm" 
                      className={`relative transition-all duration-200 ${
                        isActiveRoute('/messages') 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                          : 'hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Mesaje
                      {unreadCount && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white animate-pulse">
                          {unreadCount}
                        </span>
                      )}
                      {isActiveRoute('/messages') && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                      )}
                    </Button>
                  </Link>

                  <Link to="/reviews">
                    <Button 
                      variant={isActiveRoute('/reviews') ? "default" : "ghost"} 
                      size="sm" 
                      className={`relative transition-all duration-200 ${
                        isActiveRoute('/reviews') 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                          : 'hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Recenzii
                      {isActiveRoute('/reviews') && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                      )}
                    </Button>
                  </Link>
                </nav>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <NotificationBell />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCartOpen(true)}
                    className="relative hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 group"
                  >
                    <ShoppingBag className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                    {cartItemCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-orange-500 hover:bg-orange-600 animate-bounce">
                        {cartItemCount}
                      </Badge>
                    )}
                  </Button>

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="relative group">
                        <Avatar className="h-8 w-8 ring-2 ring-transparent group-hover:ring-blue-200 transition-all duration-200">
                          <AvatarImage src={avatarUrl} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold">
                            {profile?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <ChevronDown className="h-3 w-3 ml-1 text-gray-500 group-hover:text-gray-700 transition-colors" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-2">
                      <DropdownMenuLabel className="font-semibold text-gray-900">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                              {profile?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold">{profile?.full_name || 'Utilizator'}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDashboardClick} className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" />
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/my-listings')} className="cursor-pointer">
                        <Package className="h-4 w-4 mr-2" />
                        Echipamentele mele
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/reviews')} className="cursor-pointer">
                        <Star className="h-4 w-4 mr-2" />
                        Recenzii
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-700">
                        <LogOut className="h-4 w-4 mr-2" />
                        Ieși din cont
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Status Badges */}
                  <div className="flex items-center space-x-2">
                    {profile?.is_verified && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Verificat
                      </Badge>
                    )}
                    {profile?.role === 'admin' && (
                      <Link to="/admin">
                        <Button variant="ghost" size="sm" className="bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 hover:from-purple-100 hover:to-pink-100 border border-purple-200">
                          <Shield className="h-4 w-4 mr-1" />
                          Admin
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/browse">
                  <Button variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-blue-600 transition-all duration-200">
                    <Compass className="h-4 w-4 mr-2" />
                    Caută
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleAuthClick('login')} 
                  className="hover:bg-blue-50 hover:text-blue-700 transition-all duration-200"
                >
                  <User className="h-4 w-4 mr-2" />
                  Conectează-te
                </Button>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105" 
                  size="sm" 
                  onClick={() => handleAuthClick('signup')}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Înregistrează-te gratuit
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden relative group"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <div className="relative">
              {isMobileMenuOpen ? (
                <X className="h-5 w-5 transition-all duration-200 group-hover:scale-110" />
              ) : (
                <Menu className="h-5 w-5 transition-all duration-200 group-hover:scale-110" />
              )}
            </div>
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
            <div className="container mx-auto px-4 py-6 space-y-4">
              {user ? (
                <>
                  {/* User Info */}
                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                    <Avatar className="h-12 w-12 ring-2 ring-blue-200">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold">
                        {profile?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{profile?.full_name || 'Utilizator'}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        {profile?.is_verified && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Verificat
                          </Badge>
                        )}
                        {profile?.role === 'admin' && (
                          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-2">
                    <Link 
                      to="/browse" 
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                        isActiveRoute('/browse') 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Compass className="h-5 w-5" />
                      <span className="font-medium">Caută</span>
                    </Link>
                    
                    <Link 
                      to="/dashboard" 
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                        isActiveRoute('/dashboard') 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      <span className="font-medium">Dashboard</span>
                    </Link>

                    <Link 
                      to="/messages" 
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 relative ${
                        isActiveRoute('/messages') 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <MessageSquare className="h-5 w-5" />
                      <span className="font-medium">Mesaje</span>
                      {unreadCount && unreadCount > 0 && (
                        <Badge className="ml-auto bg-red-500 text-white text-xs">
                          {unreadCount}
                        </Badge>
                      )}
                    </Link>

                    <Link 
                      to="/reviews" 
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                        isActiveRoute('/reviews') 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Star className="h-5 w-5" />
                      <span className="font-medium">Recenzii</span>
                    </Link>

                    <Link 
                      to="/my-listings" 
                      className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Package className="h-5 w-5" />
                      <span className="font-medium">Echipamentele mele</span>
                    </Link>

                    {profile?.role === 'admin' && (
                      <Link 
                        to="/admin" 
                        className="flex items-center space-x-3 p-3 rounded-lg text-purple-700 hover:bg-purple-50 transition-all duration-200"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Shield className="h-5 w-5" />
                        <span className="font-medium">Admin</span>
                      </Link>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      className="w-full justify-start hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all duration-200"
                      onClick={() => {
                        setIsCartOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Coș ({cartItemCount})
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all duration-200" 
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Ieși din cont
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <Link 
                    to="/browse"
                    className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Compass className="h-5 w-5" />
                    <span className="font-medium">Caută</span>
                  </Link>
                  
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start hover:bg-blue-50 hover:text-blue-700 transition-all duration-200" 
                      onClick={() => handleAuthClick('login')}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Conectează-te
                    </Button>
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300" 
                      onClick={() => handleAuthClick('signup')}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Înregistrează-te gratuit
                    </Button>
                  </div>
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
