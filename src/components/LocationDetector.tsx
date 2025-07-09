
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const romanianCounties = [
  'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani', 'Brăila', 'Brașov', 
  'București', 'Buzău', 'Călărași', 'Caraș-Severin', 'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 
  'Dolj', 'Galați', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 
  'Maramureș', 'Mehedinți', 'Mureș', 'Neamț', 'Olt', 'Prahova', 'Sălaj', 'Satu Mare', 'Sibiu', 
  'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vâlcea', 'Vaslui', 'Vrancea'
];

interface LocationDetectorProps {
  onLocationChange: (location: string) => void;
  currentLocation?: string;
  className?: string;
}

export const LocationDetector: React.FC<LocationDetectorProps> = ({
  onLocationChange,
  currentLocation = '',
  className = ''
}) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      setDetectionError('Geolocația nu este suportată de browser-ul tău');
      return;
    }

    setIsDetecting(true);
    setDetectionError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      const { latitude, longitude } = position.coords;
      const county = await reverseGeocode(latitude, longitude);
      
      if (county) {
        onLocationChange(county);
        toast({
          title: 'Locație detectată!',
          description: `Ai fost localizat în județul ${county}`,
        });
      } else {
        setDetectionError('Nu am putut determina județul din coordonatele GPS');
      }
    } catch (error: unknown) {
      console.error('Location detection error:', error);
      
      let errorMessage = 'Nu am putut detecta locația';
      if ((error as GeolocationPositionError).code === 1) {
        errorMessage = 'Accesul la locație a fost refuzat. Te rugăm să permiți accesul în setările browser-ului.';
      } else if ((error as GeolocationPositionError).code === 2) {
        errorMessage = 'Locația nu a putut fi determinată. Verifică-ți conexiunea la internet.';
      } else if ((error as GeolocationPositionError).code === 3) {
        errorMessage = 'Detectarea locației a durat prea mult. Încearcă din nou.';
      }
      
      setDetectionError(errorMessage);
    } finally {
      setIsDetecting(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      // Using OpenStreetMap Nominatim API (free and no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=8&accept-language=ro`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }
      
      const data = await response.json();
      
      // Extract county from address components
      const address = data.address;
      if (address) {
        // Try different possible county fields
        const county = address.county || address.state || address.region;
        
        if (county) {
          // Map common county names to Romanian counties
          const countyMapping: { [key: string]: string } = {
            'București': 'București',
            'Bucharest': 'București',
            'Cluj': 'Cluj',
            'Timiș': 'Timiș',
            'Brașov': 'Brașov',
            'Brasov': 'Brașov',
            'Constanța': 'Constanța',
            'Constanta': 'Constanța',
            'Iași': 'Iași',
            'Iasi': 'Iași',
            'Sibiu': 'Sibiu',
            'Arad': 'Arad',
            'Oradea': 'Bihor',
            'Bihor': 'Bihor',
            'Craiova': 'Dolj',
            'Dolj': 'Dolj',
            'Galați': 'Galați',
            'Galati': 'Galați',
            'Ploiești': 'Prahova',
            'Prahova': 'Prahova',
            'Târgu Mureș': 'Mureș',
            'Targu Mures': 'Mureș',
            'Mureș': 'Mureș',
            'Mures': 'Mureș',
            'Bacău': 'Bacău',
            'Bacau': 'Bacău',
            'Pitești': 'Argeș',
            'Pitesti': 'Argeș',
            'Argeș': 'Argeș',
            'Arges': 'Argeș',
            'Baia Mare': 'Maramureș',
            'Maramureș': 'Maramureș',
            'Maramures': 'Maramureș',
            'Buzău': 'Buzău',
            'Buzau': 'Buzău',
            'Botoșani': 'Botoșani',
            'Botosani': 'Botoșani',
            'Sălaj': 'Sălaj',
            'Salaj': 'Sălaj',
            'Vâlcea': 'Vâlcea',
            'Valcea': 'Vâlcea',
            'Suceava': 'Suceava',
            'Vaslui': 'Vaslui',
            'Vrancea': 'Vrancea',
            'Călărași': 'Călărași',
            'Calarasi': 'Călărași',
            'Giurgiu': 'Giurgiu',
            'Ialomița': 'Ialomița',
            'Ialomita': 'Ialomița',
            'Ilfov': 'Ilfov',
            'Mehedinți': 'Mehedinți',
            'Mehedinti': 'Mehedinți',
            'Neamț': 'Neamț',
            'Neamt': 'Neamț',
            'Olt': 'Olt',
            'Teleorman': 'Teleorman',
            'Tulcea': 'Tulcea',
            'Caraș-Severin': 'Caraș-Severin',
            'Caras-Severin': 'Caraș-Severin',
            'Covasna': 'Covasna',
            'Dâmbovița': 'Dâmbovița',
            'Dambovita': 'Dâmbovița',
            'Gorj': 'Gorj',
            'Harghita': 'Harghita',
            'Hunedoara': 'Hunedoara',
            'Satu Mare': 'Satu Mare'
          };
          
          const mappedCounty = countyMapping[county];
          if (mappedCounty) {
            return mappedCounty;
          }
          
          // If no mapping found, check if it's already a valid Romanian county
          if (romanianCounties.includes(county)) {
            return county;
          }
        }
      }
      
      return null;
    } catch (error: unknown) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Location Detection Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={detectLocation}
        disabled={isDetecting}
        className="w-full flex items-center justify-center space-x-2 h-11 border-gray-200 hover:bg-blue-50 hover:border-blue-300"
      >
        {isDetecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MapPin className="h-4 w-4" />
        )}
        <span>{isDetecting ? 'Se detectează...' : 'Detectează locația'}</span>
      </Button>

      {/* Error Message */}
      {detectionError && (
        <div className="flex items-start space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{detectionError}</span>
        </div>
      )}

      {/* Manual Selection */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500">sau selectează manual:</p>
        <Select value={currentLocation} onValueChange={onLocationChange}>
          <SelectTrigger className="h-11 border-gray-200 focus:border-blue-500 bg-white rounded-lg shadow-sm">
            <SelectValue placeholder="Selectează județul" />
          </SelectTrigger>
          <SelectContent className="bg-white z-50 rounded-xl shadow-xl border border-gray-200">
            {romanianCounties.map((county) => (
              <SelectItem key={county} value={county} className="rounded-lg">
                {county}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=8&accept-language=ro`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }
    
    const data = await response.json();
    const address = data.address;
    
    if (address) {
      const county = address.county || address.state || address.region;
      
      if (county) {
        const countyMapping: { [key: string]: string } = {
          'București': 'București',
          'Bucharest': 'București',
          'Cluj': 'Cluj',
          'Timiș': 'Timiș',
          'Brașov': 'Brașov',
          'Brasov': 'Brașov',
          'Constanța': 'Constanța',
          'Constanta': 'Constanța',
          'Iași': 'Iași',
          'Iasi': 'Iași',
          'Sibiu': 'Sibiu',
          'Arad': 'Arad',
          'Oradea': 'Bihor',
          'Bihor': 'Bihor',
          'Craiova': 'Dolj',
          'Dolj': 'Dolj',
          'Galați': 'Galați',
          'Galati': 'Galați',
          'Ploiești': 'Prahova',
          'Prahova': 'Prahova',
          'Târgu Mureș': 'Mureș',
          'Targu Mures': 'Mureș',
          'Mureș': 'Mureș',
          'Mures': 'Mureș',
          'Bacău': 'Bacău',
          'Bacau': 'Bacău',
          'Pitești': 'Argeș',
          'Pitesti': 'Argeș',
          'Argeș': 'Argeș',
          'Arges': 'Argeș',
          'Baia Mare': 'Maramureș',
          'Maramureș': 'Maramureș',
          'Maramures': 'Maramureș',
          'Buzău': 'Buzău',
          'Buzau': 'Buzău',
          'Botoșani': 'Botoșani',
          'Botosani': 'Botoșani',
          'Sălaj': 'Sălaj',
          'Salaj': 'Sălaj',
          'Vâlcea': 'Vâlcea',
          'Valcea': 'Vâlcea',
          'Suceava': 'Suceava',
          'Vaslui': 'Vaslui',
          'Vrancea': 'Vrancea',
          'Călărași': 'Călărași',
          'Calarasi': 'Călărași',
          'Giurgiu': 'Giurgiu',
          'Ialomița': 'Ialomița',
          'Ialomita': 'Ialomița',
          'Ilfov': 'Ilfov',
          'Mehedinți': 'Mehedinți',
          'Mehedinti': 'Mehedinți',
          'Neamț': 'Neamț',
          'Neamt': 'Neamț',
          'Olt': 'Olt',
          'Teleorman': 'Teleorman',
          'Tulcea': 'Tulcea',
          'Caraș-Severin': 'Caraș-Severin',
          'Caras-Severin': 'Caraș-Severin',
          'Covasna': 'Covasna',
          'Dâmbovița': 'Dâmbovița',
          'Dambovita': 'Dâmbovița',
          'Gorj': 'Gorj',
          'Harghita': 'Harghita',
          'Hunedoara': 'Hunedoara',
          'Satu Mare': 'Satu Mare'
        };
        
        const mappedCounty = countyMapping[county];
        if (mappedCounty) {
          return mappedCounty;
        }
        
        if (romanianCounties.includes(county)) {
          return county;
        }
      }
    }
    
    return null;
  } catch (error: unknown) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};
