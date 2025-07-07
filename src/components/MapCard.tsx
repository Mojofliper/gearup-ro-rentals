import React from 'react';

interface Props {
  lat: number;
  lng: number;
  address: string;
}

export const MapCard: React.FC<Props> = ({ lat, lng, address }) => {
  const staticUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&markers=color:red%7C${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
  return (
    <div className="rounded border overflow-hidden">
      <img src={staticUrl} alt="Pickup location map" className="w-full" />
      <div className="p-2 text-sm text-muted-foreground">{address}</div>
    </div>
  );
}; 