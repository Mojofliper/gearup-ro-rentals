
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AuthModal } from './AuthModal';
import { Cart } from './Cart';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, User, LogOut, MessageCircle, ShoppingCart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NotificationDropdown } from './NotificationDropdown';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

export const Header = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const { user, logout } = useAuth();

  // Load cart count on component mount and listen for cart updates
  useEffect(() => {
    const updateCartCount = () => {
      try {
        const savedCart = localStorage.getItem('gearup-cart');
        if (savedCart) {
          const cartItems = JSON.parse(savedCart);
          setCartItemCount(cartItems.length);
        } else {
          setCartItemCount(0);
        }
      } catch (error) {
        console.error('Error reading cart:', error);
        setCartItemCount(0);
      }
    };

    // Update count on mount
    updateCartCount();

    // Listen for cart updates
    const handleCartUpdate = () => {
      updateCartCount();
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCheckout = (cartItems: any[]) => {
    // Handle checkout logic here
    toast({
      title: 'Comanda finalizată!',
      description: 'Rezervările au fost procesate cu succes.',
    });
    
    // Clear cart after successful checkout
    localStorage.removeItem('gearup-cart');
    setCartItemCount(0);
    window.dispatchEvent(new Event('cartUpdated'));
    setIsCartOpen(false);
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <img
            src="/lovable-uploads/406e4a74-137e-4264-b297-135705a49e5c.png"
            alt="GearUp Logo"
            className="h-8 w-auto"
          />
        </Link>

        {/* Right side - Auth/User Menu */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <NotificationDropdown />
              
              {/* Add Gear Button */}
              <Button asChild className="hidden md:flex bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
                <Link to="/add-gear">
                  Adaugă echipamentul tău
                </Link>
              </Button>
              
              {/* Cart Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {cartItemCount}
                  </Badge>
                )}
              </Button>
              
              {/* Messages Button */}
              <Button variant="ghost" size="icon" asChild>
                <Link to="/messages">
                  <MessageCircle className="h-5 w-5" />
                </Link>
              </Button>
              
              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || user.email} />
                      <AvatarFallback>
                        {user.user_metadata?.full_name ? user.user_metadata.full_name[0].toUpperCase() : user.email?.[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user.user_metadata?.full_name && (
                        <p className="font-medium">{user.user_metadata.full_name}</p>
                      )}
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profilul meu</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Ieșire</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => setIsAuthModalOpen(true)}>
              Autentificare
            </Button>
          )}

          {/* Mobile menu trigger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              {/* Mobile menu content */}
              <nav className="flex flex-col space-y-4">
                {user ? (
                  <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
                    <Link to="/add-gear" onClick={() => setMobileMenuOpen(false)}>
                      Adaugă echipamentul tău
                    </Link>
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      setIsAuthModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full"
                  >
                    Autentificare
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

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
    </header>
  );
};
