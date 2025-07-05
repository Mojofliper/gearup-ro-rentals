
import React from 'react';
import { RentOfferToggle } from '../RentOfferToggle';

export const AddGearHeader: React.FC = () => {
  return (
    <div className="text-center mb-12">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-4">
        Adaugă echipament
      </h1>
      <p className="text-xl text-gray-600">
        Publică echipamentul tău și câștigă bani din închiriere
      </p>
      <div className="mt-10">
        <RentOfferToggle />
      </div>
    </div>
  );
};
