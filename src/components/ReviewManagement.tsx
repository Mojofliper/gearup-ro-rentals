import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Edit, X, Check } from "lucide-react";
import { useUserReviews, useUpdateReview } from "@/hooks/useUserData";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface ReviewManagementProps {
  className?: string;
}

export const ReviewManagement: React.FC<ReviewManagementProps> = ({
  className,
}) => {
  const { user } = useAuth();
  const { data: reviews = [], isLoading } = useUserReviews();
  const { mutate: updateReview, isLoading: isUpdating } = useUpdateReview();

  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleEdit = (review: Record<string, unknown>) => {
    setEditingReview(review.id as string);
    setEditRating(review.rating as number);
    setEditComment((review.comment as string) || "");
  };

  const handleCancelEdit = () => {
    setEditingReview(null);
    setEditRating(0);
    setEditComment("");
    setHoveredRating(0);
  };

  const handleSaveEdit = () => {
    if (!editingReview || editRating === 0) {
      toast({
        title: "Rating obligatoriu",
        description: "Te rugăm să dai o notă înainte de a salva.",
        variant: "destructive",
      });
      return;
    }

    updateReview({
      reviewId: editingReview,
      updates: {
        rating: editRating,
        comment: editComment.trim() || null,
      },
    });

    toast({
      title: "Recenzie actualizată!",
      description: "Recenzia ta a fost actualizată cu succes.",
    });
    handleCancelEdit();
  };

  const canEditReview = (review: Record<string, unknown>) => {
    return user?.id === (review.reviewer_id as string);
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle>Recenziile mele</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle>Recenziile mele</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nu ai încă nicio recenzie.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle>Recenziile mele ({reviews.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border rounded-lg p-4">
                {editingReview === review.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {review.reviewed?.full_name
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">
                            {review.reviewed?.full_name || "Utilizator"}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Pentru {review.gear?.title}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={isUpdating}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={isUpdating || editRating === 0}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Rating */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Rating *
                      </Label>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className="p-1 hover:scale-110 transition-transform"
                            onClick={() => setEditRating(star)}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                          >
                            <Star
                              className={`h-6 w-6 ${
                                star <= (hoveredRating || editRating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comment */}
                    <div>
                      <Label htmlFor={`comment-${review.id}`}>Comentariu</Label>
                      <Textarea
                        id={`comment-${review.id}`}
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        placeholder="Scrie un comentariu..."
                        rows={3}
                      />
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {review.reviewed?.full_name
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">
                            {review.reviewed?.full_name || "Utilizator"}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Pentru {review.gear?.title}
                          </p>
                        </div>
                      </div>

                      {canEditReview(review) && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(review)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Rating Display */}
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {review.rating}/5
                      </span>
                    </div>

                    {/* Comment */}
                    {review.comment && (
                      <p className="text-sm text-gray-600 mb-2">
                        {review.comment}
                      </p>
                    )}

                    {/* Date */}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(review.created_at), "dd MMMM yyyy", {
                        locale: ro,
                      })}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
