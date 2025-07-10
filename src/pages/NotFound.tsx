import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

// Log the 404 error for debugging
console.log(
  "404 Error: User attempted to access non-existent route:",
  window.location.pathname
);

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Pagina nu a fost găsită</p>
        <Button asChild>
          <Link to="/">
            <Home className="h-4 w-4 mr-2" />
            Înapoi la pagina principală
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
