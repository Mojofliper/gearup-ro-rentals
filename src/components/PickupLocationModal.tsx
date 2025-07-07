import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { loadGoogleMaps } from '@/utils/googleMaps';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const PickupLocationModal: React.FC<Props> = ({ bookingId, isOpen, onClose, onSaved }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState<{ lat: number; lng: number; address: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const init = async () => {
      try {
        const google = await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string);
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current!, { types: ['establishment','geocode'] });
        autocomplete.addListener('place_changed', () => {
          const p = autocomplete.getPlace();
          if (!p.geometry) return;
          setPlace({ lat: p.geometry.location.lat(), lng: p.geometry.location.lng(), address: p.formatted_address });
        });
      } catch (err) {
        console.error(err);
        toast.error('Google Maps failed to load');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [isOpen]);

  const handleSave = async () => {
    if (!place) return toast.error('Selectează locația');
    const { error } = await supabase.from('bookings').update({ pickup_location: place.address, pickup_lat: place.lat, pickup_lng: place.lng }).eq('id', bookingId);
    if (error) toast.error(error.message); else { toast.success('Locație salvată'); onSaved(); onClose(); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Setează locația de ridicare</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input ref={inputRef} type="text" placeholder="Caută adresa" className="w-full border p-2 rounded" />
          {place && <p className="text-sm">{place.address}</p>}
          <Button onClick={handleSave} disabled={!place}>Salvează</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 