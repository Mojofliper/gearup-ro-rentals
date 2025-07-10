import React from "react";
import { Loader2 } from "lucide-react";

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center mb-6">
          <img
            src="/lovable-uploads/81ffbf32-0e06-4641-b110-f9aec3ae32c7.png"
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
