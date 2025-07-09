import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import { useCreateReview } from '@/hooks/useReviews';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Record<string, unknown>;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  booking
}) => {
  const { user } = useAuth();
  const { mutate: createReview, isPending } = useCreateReview();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');

  // Determine who to review (if user is renter, review owner; if user is owner, review renter)
  const reviewedUser = user?.id === booking.renter_id ? booking.owner : booking.renter;
  const isReviewingOwner = user?.id === booking.renter_id;

  const handleSubmit = () => {
    if (!user || rating === 0) {
      toast({
        title: 'Rating obligatoriu',
        description: 'Te rugăm să dai o notă înainte de a trimite recenzia.',
        variant: 'destructive',
      });
      return;
    }

    createReview({
      booking_id: booking.id,
      gear_id: booking.gear_id,
      reviewer_id: user.id,
      reviewed_id: reviewedUser.id,
      rating,
      comment: comment.trim() || null
    }, {
      onSuccess: () => {
        toast({
          title: 'Recenzie trimisă!',
          description: 'Mulțumim pentru feedback-ul tău.',
        });
        onClose();
      },
      onError: (error: unknown) => {
        toast({
          title: 'Eroare',
          description: 'Nu s-a putut trimite recenzia. Te rugăm să încerci din nou.',
          variant: 'destructive',
        });
        console.error('Review error:', error);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lasă o recenzie</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {reviewedUser?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{reviewedUser?.full_name || 'Utilizator'}</h3>
              <p className="text-sm text-muted-foreground">
                {isReviewingOwner ? 'Proprietar' : 'Închiriator'}
              </p>
            </div>
          </div>

          {/* Gear Info */}
          <div className="text-sm text-muted-foreground">
                          <p>Pentru închirierea: <span className="font-medium">{booking.gear?.title}</span></p>
          </div>

          {/* Rating */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Cât de mulțumit ai fost? *
            </Label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 hover:scale-110 transition-transform"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  <Star 
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating) 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300'
                    }`} 
                  />
                </button>
              ))}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {rating === 0 && 'Selectează o notă'}
              {rating === 1 && 'Foarte nemulțumit'}
              {rating === 2 && 'Nemulțumit'}
              {rating === 3 && 'Acceptabil'}
              {rating === 4 && 'Mulțumit'}
              {rating === 5 && 'Foarte mulțumit'}
            </div>
          </div>

          {/* Comment */}
          <div>
            <Label htmlFor="comment">Comentariu (opțional)</Label>
            <Textarea
              id="comment"
              placeholder={
                isReviewingOwner 
                  ? "Cum a fost experiența cu proprietarul și echipamentul?"
                  : "Cum a fost experiența cu închiriatorul?"
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isPending}
          >
            Anulează
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isPending || rating === 0}
          >
            {isPending ? 'Se trimite...' : 'Trimite recenzia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
