import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, CheckCircle, Clock, AlertCircle, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateBooking } from '@/hooks/useBookings';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ConfirmationSystemProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Record<string, unknown>;
  type: 'pickup' | 'return';
}

export const ConfirmationSystem: React.FC<ConfirmationSystemProps> = ({
  isOpen,
  onClose,
  booking,
  type
}) => {
  const { user } = useAuth();
  const { mutate: updateBooking } = useUpdateBooking();
  const [confirming, setConfirming] = useState(false);
  const [notes, setNotes] = useState('');

  // Early return if no booking data
  if (!booking) {
    return null;
  }

  const isOwner = user?.id === booking.owner_id;
  const isRenter = user?.id === booking.renter_id;

  const handleConfirm = async () => {
    if (!user) return;

    setConfirming(true);
    try {
      let updates: Record<string, unknown> = { notes: notes || null };
      
      if (type === 'pickup') {
        if (isOwner) {
          // Owner confirms pickup - change status to active
          updates.status = 'active';
        } else if (isRenter) {
          // Renter confirms pickup - change status to active
          updates.status = 'active';
        }
      } else {
        if (isRenter) {
          // Renter confirms return - change status to returned
          updates.status = 'returned';
        } else if (isOwner) {
          // Owner confirms return - change status to completed
          updates.status = 'completed';
        }
      }
      
      updateBooking({
        bookingId: booking.id as string,
        updates
      }, {
        onSuccess: () => {
          const action = type === 'pickup' ? 'ridicare' : 'returnare';
          const role = isOwner ? 'proprietar' : 'chiriaș';
          toast({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} confirmată!`,
            description: `Confirmarea ${role}ului a fost înregistrată.`,
          });
          onClose();
        },
        onError: (error: unknown) => {
          toast({
            title: 'Eroare',
            description: 'Nu s-a putut confirma operația.',
            variant: 'destructive',
          });
          console.error('Confirmation error:', error);
        }
      });
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'A apărut o eroare neașteptată.',
        variant: 'destructive',
      });
    } finally {
      setConfirming(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="secondary">Confirmat</Badge>;
      case 'active':
        return <Badge variant="default">În curs</Badge>;
      case 'completed':
        return <Badge variant="outline">Finalizat</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canConfirm = () => {
    if (type === 'pickup') {
      // Owner can confirm pickup if booking is confirmed
      if (isOwner && booking.status === 'confirmed') {
        return true;
      }
      // Renter can confirm pickup if booking is confirmed
      if (isRenter && booking.status === 'confirmed') {
        return true;
      }
    } else {
      // Renter can confirm return if booking is active
      if (isRenter && booking.status === 'active') {
        return true;
      }
      // Owner can confirm return if booking is returned
      if (isOwner && booking.status === 'returned') {
        return true;
      }
    }
    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {type === 'pickup' ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Confirmă ridicarea</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span>Confirmă returnarea</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Booking Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                  {(booking.gear as any)?.gear_photos && (booking.gear as any).gear_photos.length > 0 ? (
                    <img
                      src={(booking.gear as any).gear_photos[0]}
                      alt={(booking.gear as any).title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Camera className="h-6 w-6" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800">{(booking.gear as any)?.title}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-xs">
                        {type === 'pickup' 
                          ? (booking.renter as any)?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'
                          : (booking.owner as any)?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'
                        }
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-600">
                      {type === 'pickup' 
                        ? (booking.renter as any)?.full_name 
                        : (booking.owner as any)?.full_name
                      }
                    </span>
                  </div>
                </div>
                
                {getStatusBadge(booking.status as string)}
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">Perioada închirierii</span>
                </div>
                <div className="text-sm text-gray-600">
                  {format(new Date(booking.start_date as string), 'dd MMM yyyy')} - {format(new Date(booking.end_date as string), 'dd MMM yyyy')}
                </div>
                <div className="text-sm text-gray-600">
                  {(booking.total_days as number)} {(booking.total_days as number) === 1 ? 'zi' : 'zile'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Locație: {type === 'pickup' ? (booking.owner as any)?.location : (booking.renter as any)?.location}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Confirmation Instructions */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-800">
                  {type === 'pickup' ? 'Instrucțiuni ridicare:' : 'Instrucțiuni returnare:'}
                </h4>
                
                {type === 'pickup' ? (
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>Verifică starea echipamentului înainte de predare</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>Testează funcționalitatea de bază</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>Fotografiază orice defect existent</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>Confirmă că ai predat echipamentul închiriatorului</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                      <span>Verifică că ai returnat echipamentul complet</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                      <span>Asigură-te că este în aceeași stare</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                      <span>Fotografiază starea la returnare</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                      <span>Confirmă că ai returnat echipamentul proprietarului</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Observații (opțional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={type === 'pickup' 
                ? "Observații despre starea echipamentului la predare către închiriator..."
                : "Observații despre starea echipamentului la returnare către proprietar..."
              }
              className="w-full p-3 border border-gray-300 rounded-md text-sm resize-none"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm() || confirming}
              className="w-full"
            >
              {confirming ? (
                'Se confirmă...'
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {type === 'pickup' ? 'Confirmă ridicarea' : 'Confirmă returnarea'}
                </>
              )}
            </Button>
            
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
              disabled={confirming}
            >
              Anulează
            </Button>
          </div>

          {/* Status Info */}
          {!canConfirm() && (
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                {type === 'pickup' 
                  ? 'Doar proprietarul echipamentului poate confirma ridicarea'
                  : 'Doar închiriatorul poate confirma returnarea'
                }
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 
