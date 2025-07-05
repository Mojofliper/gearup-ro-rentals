import React from 'react';

const PaymentCancel: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Plată anulată</h1>
        <p className="mb-4">Plata a fost anulată sau nu a fost finalizată. Poți încerca din nou oricând.</p>
        <a href="/profile" className="text-blue-600 underline">Înapoi la profil</a>
      </div>
    </div>
  );
};

export default PaymentCancel; 