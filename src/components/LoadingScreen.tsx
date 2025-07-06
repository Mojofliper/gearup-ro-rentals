
import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center mb-6">
          <img 
            src="/lovable-uploads/406e4a74-137e-4264-b297-135705a49e5c.png" 
            alt="GearUp" 
            className="h-12 w-auto"
          />
        </div>
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Se încarcă...</span>
        </div>
      </div>
    </div>
  );
};
