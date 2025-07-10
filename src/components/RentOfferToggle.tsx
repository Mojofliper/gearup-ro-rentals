import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const RentOfferToggle: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determină pagina activă
  const active = location.pathname.startsWith("/add-gear") ? "offer" : "rent";

  return (
    <div className="flex justify-center mb-8">
      <ToggleGroup
        type="single"
        value={active}
        className="bg-white/80 border border-gray-200 shadow-md rounded-full p-1 backdrop-blur-sm"
      >
        <ToggleGroupItem
          value="rent"
          aria-label="Închiriază echipament"
          className={`rounded-full px-6 py-2 text-base font-semibold transition-all duration-300
            ${
              active === "rent"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 !text-white shadow-md"
                : "text-black bg-transparent"
            }
          `}
          style={{ minWidth: 170 }}
          onClick={() => navigate("/browse")}
        >
          Închiriază echipament
        </ToggleGroupItem>
        <ToggleGroupItem
          value="offer"
          aria-label="Oferă spre închiriere"
          className={`rounded-full px-6 py-2 text-base font-semibold transition-all duration-300
            ${
              active === "offer"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 !text-white shadow-md"
                : "text-black bg-transparent"
            }
          `}
          style={{ minWidth: 170 }}
          onClick={() => navigate("/add-gear")}
        >
          Oferă spre închiriere
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};
