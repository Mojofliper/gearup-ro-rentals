import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useSendMessage } from '@/hooks/useMessages';
import { useNavigate } from 'react-router-dom';

interface Props {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41]
});

const DEFAULT_CENTER = { lat: 45.9432, lng: 24.9668 }; // Romania center

function LocationPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export const PickupLocationModal: React.FC<Props> = ({ bookingId, isOpen, onClose, onSaved }) => {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [place, setPlace] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const { notifyPickupLocationSet } = useNotifications();
  const { mutateAsync: sendMessage } = useSendMessage();
  const navigate = useNavigate();

  // Geocode search
  const handleSearch = async () => {
    if (!search) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setPlace({ lat: parseFloat(lat), lng: parseFloat(lon), address: display_name });
        setMapCenter({ lat: parseFloat(lat), lng: parseFloat(lon) });
      } else {
        toast.error('Adresa nu a fost găsită');
      }
    } catch (err) {
      toast.error('Eroare la căutarea adresei');
    } finally {
      setSearching(false);
    }
  };

  // Map click handler
  const handleMapPick = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      setPlace({ lat, lng, address: data.display_name || `${lat}, ${lng}` });
      setMapCenter({ lat, lng });
    } catch {
      setPlace({ lat, lng, address: `${lat}, ${lng}` });
      setMapCenter({ lat, lng });
    }
  };

  const handleSave = async () => {
    if (!place) return toast.error('Selectează locația');
    
    try {
      // Update booking with pickup location
      const { error } = await supabase
        .from('bookings')
        .update({ 
          pickup_location: place.address, 
          pickup_lat: place.lat, 
          pickup_lng: place.lng 
        })
        .eq('id', bookingId);

      if (error) {
        toast.error(error.message);
        return;
      }

      // Send notification about pickup location being set
      try {
        // Get booking and gear details for notification
        const { data: booking } = await supabase
          .from('bookings')
          .select('renter_id, gear_id')
          .eq('id', bookingId)
          .single();
        
        if (booking) {
          const { data: gear } = await supabase
            .from('gear')
            .select('title')
            .eq('id', booking.gear_id)
            .single();
          
          if (gear) {
            await notifyPickupLocationSet(bookingId, gear.title, booking.renter_id);
          }
        }
      } catch (notifError) {
        console.error('Error sending pickup location notification:', notifError);
      }

      // Send system message to chat with location
      try {
        const mapUrl = `https://www.openstreetmap.org/search?query=${place.lat},${place.lng}`;
        const content = `📍 Locația de pickup a fost setată: ${place.address}\n\n[Vezi pe hartă](${mapUrl})`;
        await sendMessage({ bookingId, content, messageType: 'system' });
      } catch (msgError) {
        console.error('Error sending system message for pickup location:', msgError);
      }

      toast.success('Locație salvată și mesaj trimis!');
      onSaved();
      onClose();
      
      // Redirect owner to messages page
      navigate(`/messages?booking=${bookingId}`);
      
    } catch (error) {
      console.error('Error saving pickup location:', error);
      toast.error('Eroare la salvarea locației');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setPlace(null);
      setMapCenter(DEFAULT_CENTER);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Setează locația de ridicare</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Caută adresa"
              className="w-full border p-2 rounded"
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? 'Caută...' : 'Caută'}
            </Button>
          </div>
          <div style={{ height: 300, width: '100%' }}>
            {/* @ts-expect-error: React Leaflet v4 type issues */}
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              {/* @ts-expect-error: React Leaflet v4 type issues */}
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
              />
              {/* @ts-expect-error: React Leaflet v4 type issues */}
              {place && <Marker position={[place.lat, place.lng]} icon={markerIcon} />}
              <LocationPicker onPick={handleMapPick} />
            </MapContainer>
          </div>
          {place && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">Locație selectată:</p>
              <p className="text-sm text-gray-600">{place.address}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!place} className="flex-1">
              Salvează și trimite mesaj
            </Button>
            <Button variant="outline" onClick={onClose}>
              Anulează
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 