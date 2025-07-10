import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Camera, CheckCircle, Lock } from "lucide-react";

type Gear = {
  id: string;
  title: string;
  description?: string;
  price_per_day: number;
  deposit_amount: number;
  status: string;
  pickup_location?: string;
  categories?: { name: string; slug: string } | null;
  gear_photos?: Array<{ photo_url: string }>;
  users?: {
    full_name: string;
    rating: number;
    total_reviews: number;
    is_verified?: boolean;
  } | null;
  created_at?: string;
};

interface GearCardProps {
  gear: Gear;
  onBookNow?: (gearId: string) => void;
  onViewDetails?: (gearId: string) => void;
  showOwnerInfo?: boolean;
  variant?: "default" | "compact" | "featured";
}

export const GearCard = React.memo<GearCardProps>(
  ({
    gear,
    onBookNow,
    onViewDetails,
    showOwnerInfo = true,
    variant = "default",
  }) => {
    const formatPrice = (price: number) => {
      const priceInRON = price > 1000 ? price / 100 : price;
      return new Intl.NumberFormat("ro-RO", {
        style: "currency",
        currency: "RON",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(priceInRON || 0);
    };
    const formatRating = (rating: number) => rating.toFixed(1);
    const getFirstImage = () => {
      if (
        gear.gear_photos &&
        Array.isArray(gear.gear_photos) &&
        gear.gear_photos.length > 0
      ) {
        const firstPhoto = gear.gear_photos[0];
        if (typeof firstPhoto === "string") return firstPhoto;
        if (firstPhoto && typeof firstPhoto === "object")
          return firstPhoto.photo_url || firstPhoto;
      }
      return null;
    };
    const ownerName = gear.users?.full_name || "Unknown Owner";
    const ownerRating = gear.users?.rating || 0;
    const ownerReviews = gear.users?.total_reviews || 0;
    const isOwnerVerified = gear.users?.is_verified || false;
    const gearType = gear.categories?.name || "Echipament";
    const isAvailable = gear.status === "available";

    // Card click handler (except CTA)
    const handleCardClick = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      if (onViewDetails) onViewDetails(gear.id);
    };

    return (
      <Card
        className="group relative overflow-hidden rounded-2xl shadow-md border border-gray-100 bg-white transition-all duration-300 cursor-pointer hover:shadow-lg focus-within:ring-2 focus-within:ring-blue-600 flex flex-col sm:flex-row p-0 sm:min-w-[420px]"
        tabIndex={0}
        aria-label={`Detalii pentru ${gear.title}`}
        onClick={handleCardClick}
      >
        {/* Image Block */}
        <div className="relative w-full sm:w-64 flex-shrink-0 aspect-[4/3] sm:aspect-[4/3] bg-gray-100">
          {getFirstImage() ? (
            <img
              src={getFirstImage() as string}
              alt={gear.title}
              className="w-full h-full object-cover rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none">
              <Camera className="h-10 w-10 text-gray-400" />
            </div>
          )}
          {/* Gear type badge (bottom-left over image) */}
          <span className="absolute bottom-3 left-3 z-10 bg-white/90 text-blue-700 text-xs font-medium px-2 py-0.5 rounded shadow flex items-center gap-1">
            <Camera className="h-4 w-4 text-blue-400" /> {gearType}
          </span>
        </div>
        {/* Info Block */}
        <div className="flex-1 flex flex-col justify-between p-4 gap-2">
          {/* Top row: name + disponibil badge (inline) */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight truncate">
              {gear.title}
            </h3>
            {isAvailable && (
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 shadow ml-2">
                <CheckCircle className="h-4 w-4 text-green-500" /> Disponibil
              </span>
            )}
          </div>
          {/* Seller + rating + location */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 mb-1">
            <span className="font-medium truncate">by {ownerName}</span>
            {isOwnerVerified && (
              <CheckCircle className="h-4 w-4 text-blue-500 ml-1" />
            )}
            <span className="flex items-center gap-1 ml-2">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span className="font-semibold">{formatRating(ownerRating)}</span>
              <span className="text-gray-500">({ownerReviews} recenzii)</span>
            </span>
            <span className="flex items-center gap-1 ml-2 text-xs text-gray-500">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="truncate">
                {gear.pickup_location || "România"}
              </span>
            </span>
          </div>
          {/* Price + deposit row */}
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <span className="flex items-center gap-1 text-base sm:text-lg font-bold text-blue-700">
              <span className="text-xl sm:text-2xl">
                {formatPrice(gear.price_per_day)}
              </span>
              <span className="text-xs font-medium text-gray-500 ml-1">
                / zi
              </span>
            </span>
            <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
              <Lock className="h-4 w-4 text-gray-400" />
              Depozit:{" "}
              <span className="font-semibold ml-1">
                {formatPrice(gear.deposit_amount)}
              </span>
            </span>
          </div>
          {/* CTAs: right-aligned on desktop, stacked on mobile */}
          <div className="flex flex-col gap-2 mt-2 sm:flex-row sm:justify-end">
            {onBookNow && isAvailable && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onBookNow(gear.id);
                }}
                className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white font-bold text-base py-2 rounded-lg shadow"
                size="lg"
                aria-label="Închiriază acum"
              >
                Închiriază acum
              </Button>
            )}
            {onViewDetails && (
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-gray-300 text-blue-700 font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(gear.id);
                }}
                aria-label="Vezi detalii"
              >
                Vezi detalii
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  },
);

GearCard.displayName = "GearCard";
