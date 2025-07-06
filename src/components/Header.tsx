
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AuthModal } from './AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, User, LogOut, MessageCircle, Settings, Heart, ShoppingCart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NotificationDropdown } from './NotificationDropdown';

export const Header = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <img
            src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=32&h=32&fit=crop&crop=center"
            alt="GearUp Logo"
            className="w-8 h-8 rounded-lg"
          />
          <span className="font-bold text-xl">GearUp</span>
        </Link>

        {/* Right side - Auth/User Menu */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <NotificationDropdown />
              
              {/* Cart Button */}
              <Button variant="ghost" size="icon">
                <ShoppingCart className="h-5 w-5" />
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
                {!user && (
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
    </header>
  );
};
