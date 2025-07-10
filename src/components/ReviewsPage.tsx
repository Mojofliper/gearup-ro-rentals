import React, { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Star,
  MessageSquare,
  Calendar,
  Package,
  User,
  ArrowLeft,
  Plus,
  Filter,
  Search,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  Clock,
  Award,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserBookings, useUserReviews } from "@/hooks/useUserData";
import { ReviewModal } from "@/components/ReviewModal";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export const ReviewsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: bookings = [], isLoading: bookingsLoading } = useUserBookings();
  const { data: reviews = [], isLoading: reviewsLoading } = useUserReviews();
  const [reviewingBooking, setReviewingBooking] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [activeTab, setActiveTab] = useState("completed");

  // Filter completed bookings that can be reviewed
  const completedBookings = bookings.filter(
    (booking) =>
      booking.status === "completed" &&
      !reviews.some((review) => review.booking_id === booking.id),
  );

  // Filter bookings that have been reviewed
  const reviewedBookings = bookings.filter(
    (booking) =>
      booking.status === "completed" &&
      reviews.some((review) => review.booking_id === booking.id),
  );

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((acc, review) => acc + (review.rating as number), 0) /
        reviews.length
      : 0;

  const totalReviews = reviews.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Înapoi la Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Recenzii</h1>
                <p className="text-gray-600">
                  Gestionează recenziile tale și lasă feedback pentru
                  închirierile finalizate
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">
                    Rating Mediu
                  </p>
                  <div className="flex items-center space-x-1">
                    <p className="text-2xl font-bold text-blue-900">
                      {averageRating.toFixed(1)}
                    </p>
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  </div>
                </div>
                <Award className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">
                    Recenzii Lasate
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    {totalReviews}
                  </p>
                  <p className="text-xs text-green-600">Total</p>
                </div>
                <MessageSquare className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">
                    Închirieri Finalizate
                  </p>
                  <p className="text-2xl font-bold text-purple-900">
                    {completedBookings.length + reviewedBookings.length}
                  </p>
                  <p className="text-xs text-purple-600">Total</p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">
                    În Așteptare
                  </p>
                  <p className="text-2xl font-bold text-orange-900">
                    {completedBookings.length}
                  </p>
                  <p className="text-xs text-orange-600">Pentru recenzie</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="completed"
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Lasă Recenzie ({completedBookings.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="reviewed"
              className="flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Recenziile Mele ({totalReviews})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="completed" className="space-y-6">
            {bookingsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="w-24 h-8 bg-gray-200 rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : completedBookings.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nu ai închirieri finalizate
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Când finalizezi o închiriere, vei putea lăsa o recenzie
                    aici.
                  </p>
                  <Button
                    onClick={() => navigate("/browse")}
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Caută echipamente
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {completedBookings.map((booking) => (
                  <Card
                    key={booking.id as string}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={booking.owner?.avatar_url as string}
                            />
                            <AvatarFallback className="bg-blue-100 text-blue-600">
                              {(booking.owner?.full_name as string)
                                ?.split(" ")
                                .map((n: string) => n[0])
                                .join("") || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {booking.gear_title as string}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Închiriat de{" "}
                              {(booking.owner?.full_name as string) ||
                                "Utilizator"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(
                                new Date(booking.start_date as string),
                                "dd MMMM yyyy",
                                { locale: ro },
                              )}{" "}
                              -{" "}
                              {format(
                                new Date(booking.end_date as string),
                                "dd MMMM yyyy",
                                { locale: ro },
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge
                            variant="default"
                            className="bg-green-100 text-green-800"
                          >
                            Finalizat
                          </Badge>
                          <Button
                            onClick={() => setReviewingBooking(booking)}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Lasă recenzie
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviewed" className="space-y-6">
            {reviewsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="w-24 h-8 bg-gray-200 rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nu ai recenzii încă
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Când lași recenzii pentru închirierile finalizate, acestea
                    vor apărea aici.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card
                    key={review.id as string}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={review.reviewed?.avatar_url as string}
                            />
                            <AvatarFallback className="bg-blue-100 text-blue-600">
                              {(review.reviewed?.full_name as string)
                                ?.split(" ")
                                .map((n: string) => n[0])
                                .join("") || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-gray-900">
                                {(review.reviewed?.full_name as string) ||
                                  "Utilizator"}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                Pentru {review.gear?.title as string}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-1 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${i < (review.rating as number) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                                />
                              ))}
                              <span className="text-sm text-gray-600 ml-2">
                                {review.rating}/5
                              </span>
                            </div>
                            {review.comment && (
                              <p className="text-gray-700 mb-2">
                                {review.comment as string}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              {format(
                                new Date(review.created_at as string),
                                "dd MMMM yyyy",
                                { locale: ro },
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Recenzie lăsată
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />

      {/* Review Modal */}
      {reviewingBooking && (
        <ReviewModal
          isOpen={!!reviewingBooking}
          booking={reviewingBooking}
          onClose={() => setReviewingBooking(null)}
        />
      )}
    </div>
  );
};
