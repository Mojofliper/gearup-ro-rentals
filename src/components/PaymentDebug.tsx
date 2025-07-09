import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export const PaymentDebug: React.FC = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking_id');
  const [booking, setBooking] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [escrowTransactions, setEscrowTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookingData = async () => {
    if (!bookingId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch booking with all related data
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          gear:gear_id(title, price_per_day),
          owner:owner_id(full_name, email),
          renter:renter_id(full_name, email)
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError) {
        throw bookingError;
      }

      // Fetch transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('booking_id', bookingId);

      if (transactionError) {
        throw transactionError;
      }

      // Fetch escrow transactions
      const { data: escrowData, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('booking_id', bookingId);

      if (escrowError) {
        throw escrowError;
      }

      setBooking(bookingData);
      setTransactions(transactionData || []);
      setEscrowTransactions(escrowData || []);

    } catch (err) {
      console.error('Error fetching booking data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingData();
  }, [bookingId]);

  const getStatusBadge = (status: string, type: 'booking' | 'payment' | 'escrow') => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      confirmed: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-red-100 text-red-800',
      active: 'bg-purple-100 text-purple-800',
      held: 'bg-orange-100 text-orange-800',
      released: 'bg-green-100 text-green-800',
      refunded: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (!bookingId) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No booking ID provided. Add ?booking_id=YOUR_BOOKING_ID to the URL.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payment Debug - Booking {bookingId}</h1>
        <Button onClick={fetchBookingData} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {booking && (
        <>
          {/* Booking Information */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Gear:</strong> {booking.gear?.title}
                </div>
                <div>
                  <strong>Price per day:</strong> {formatPrice(booking.gear?.price_per_day || 0)}
                </div>
                <div>
                  <strong>Owner:</strong> {booking.owner?.full_name} ({booking.owner?.email})
                </div>
                <div>
                  <strong>Renter:</strong> {booking.renter?.full_name} ({booking.renter?.email})
                </div>
                <div>
                  <strong>Start Date:</strong> {new Date(booking.start_date).toLocaleDateString()}
                </div>
                <div>
                  <strong>End Date:</strong> {new Date(booking.end_date).toLocaleDateString()}
                </div>
                <div>
                  <strong>Total Amount:</strong> {formatPrice(booking.total_amount || 0)}
                </div>
                <div>
                  <strong>Rental Amount:</strong> {formatPrice(booking.rental_amount || 0)}
                </div>
                <div>
                  <strong>Deposit Amount:</strong> {formatPrice(booking.deposit_amount || 0)}
                </div>
                <div>
                  <strong>Platform Fee:</strong> {formatPrice(booking.platform_fee || 0)}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div>
                  <strong>Booking Status:</strong> {getStatusBadge(booking.status, 'booking')}
                </div>
                <div>
                  <strong>Payment Status:</strong> {getStatusBadge(booking.payment_status, 'payment')}
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <strong>Created:</strong> {new Date(booking.created_at).toLocaleString()}
                <br />
                <strong>Updated:</strong> {new Date(booking.updated_at).toLocaleString()}
                {booking.cancelled_at && (
                  <>
                    <br />
                    <strong>Cancelled:</strong> {new Date(booking.cancelled_at).toLocaleString()}
                  </>
                )}
                {booking.cancellation_reason && (
                  <>
                    <br />
                    <strong>Cancellation Reason:</strong> {booking.cancellation_reason}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Transactions ({transactions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-gray-500">No transactions found</p>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx, index) => (
                    <div key={tx.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <strong>Transaction {index + 1}</strong>
                        {getStatusBadge(tx.status, 'payment')}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><strong>Amount:</strong> {formatPrice(tx.amount || 0)}</div>
                        <div><strong>Rental Amount:</strong> {formatPrice(tx.rental_amount || 0)}</div>
                        <div><strong>Deposit Amount:</strong> {formatPrice(tx.deposit_amount || 0)}</div>
                        <div><strong>Platform Fee:</strong> {formatPrice(tx.platform_fee || 0)}</div>
                        <div><strong>Stripe Payment Intent:</strong> {tx.stripe_payment_intent_id}</div>
                        <div><strong>Stripe Charge:</strong> {tx.stripe_charge_id || 'N/A'}</div>
                      </div>
                      <div className="text-xs text-gray-600">
                        <strong>Created:</strong> {new Date(tx.created_at).toLocaleString()}
                        <br />
                        <strong>Updated:</strong> {new Date(tx.updated_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Escrow Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Escrow Transactions ({escrowTransactions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {escrowTransactions.length === 0 ? (
                <p className="text-gray-500">No escrow transactions found</p>
              ) : (
                <div className="space-y-4">
                  {escrowTransactions.map((escrow, index) => (
                    <div key={escrow.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <strong>Escrow Transaction {index + 1}</strong>
                        {getStatusBadge(escrow.escrow_status, 'escrow')}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><strong>Rental Amount:</strong> {formatPrice(escrow.rental_amount || 0)}</div>
                        <div><strong>Deposit Amount:</strong> {formatPrice(escrow.deposit_amount || 0)}</div>
                        <div><strong>Stripe Payment Intent:</strong> {escrow.stripe_payment_intent_id}</div>
                        <div><strong>Stripe Charge:</strong> {escrow.stripe_charge_id || 'N/A'}</div>
                      </div>
                      <div className="text-xs text-gray-600">
                        <strong>Created:</strong> {new Date(escrow.created_at).toLocaleString()}
                        <br />
                        <strong>Updated:</strong> {new Date(escrow.updated_at).toLocaleString()}
                        {escrow.escrow_release_date && (
                          <>
                            <br />
                            <strong>Released:</strong> {new Date(escrow.escrow_release_date).toLocaleString()}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}; 