import React from 'react';

const PaymentSuccess: React.FC = () => {
  // Optionally, you can get the session_id from the URL and verify with Stripe here
  // const params = new URLSearchParams(window.location.search);
  // const sessionId = params.get('session_id');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-green-600">Plată reușită!</h1>
        <p className="mb-4">Mulțumim pentru plata efectuată. Rezervarea ta a fost confirmată.</p>
        <a href="/profile" className="text-blue-600 underline">Mergi la profil</a>
      </div>
    </div>
  );
};

export default PaymentSuccess; 