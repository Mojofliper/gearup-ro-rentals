import React from 'react';
import { useUserBookings } from '@/hooks/useBookings';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export const BookingsPage: React.FC = () => {
  const { data: bookings = [], isLoading } = useUserBookings();
  const userId = bookings.length > 0 ? bookings[0].renter_id : null;

  const userBookings = bookings.filter((b: any) => b.renter_id === userId);
  const ownerBookings = bookings.filter((b: any) => b.owner_id === userId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Rezervările mele</h1>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
          </div>
        ) : (
          <>
            {bookings.length === 0 && (
              <div className="text-center text-muted-foreground py-12">Nu ai nicio rezervare momentan.</div>
            )}
            {userBookings.length > 0 && (
              <section className="mb-10">
                <h2 className="text-xl font-semibold mb-4">Ca chiriaș</h2>
                <div className="space-y-4">
                  {userBookings.map((booking: any) => (
                    <Card key={booking.id}>
                      <CardHeader>
                        <CardTitle>{booking.gear_title}</CardTitle>
                        <CardDescription>
                          {format(new Date(booking.start_date), 'dd MMM yyyy')} - {format(new Date(booking.end_date), 'dd MMM yyyy')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{booking.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">Proprietar: {booking.owner_name || booking.owner_id}</div>
                        <div className="text-sm text-muted-foreground">Locație pickup: {booking.pickup_location || 'Nespecificat'}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
            {ownerBookings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Ca proprietar</h2>
                <div className="space-y-4">
                  {ownerBookings.map((booking: any) => (
                    <Card key={booking.id}>
                      <CardHeader>
                        <CardTitle>{booking.gear_title}</CardTitle>
                        <CardDescription>
                          {format(new Date(booking.start_date), 'dd MMM yyyy')} - {format(new Date(booking.end_date), 'dd MMM yyyy')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{booking.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">Chiriaș: {booking.renter_name || booking.renter_id}</div>
                        <div className="text-sm text-muted-foreground">Locație pickup: {booking.pickup_location || 'Nespecificat'}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BookingsPage; 