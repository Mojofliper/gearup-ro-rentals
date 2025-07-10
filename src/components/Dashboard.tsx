import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarUpload } from "@/components/AvatarUpload";
import { useAuth } from "@/contexts/AuthContext";
import {
  useUserBookings,
  useUserListings,
  useUserReviews,
  useUserStats,
} from "@/hooks/useUserData";
import {
  useAcceptBooking,
  useConfirmReturn,
  useCompleteRental,
  useRejectBooking,
} from "@/hooks/useBookings";
import { EditGearModal } from "@/components/EditGearModal";
import { ReviewModal } from "@/components/ReviewModal";
import { useDeleteGear } from "@/hooks/useGear";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmationSystem } from "@/components/ConfirmationSystem";
import {
  Star,
  MapPin,
  Calendar,
  Edit,
  Package,
  AlertCircle,
  Eye,
  CheckCircle,
  CreditCard,
  Trash2,
  XCircle,
  Plus,
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  ShoppingBag,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  CalendarDays,
  Award,
  X,
  AlertTriangle,
} from "lucide-react";
import { PaymentModal } from "@/components/PaymentModal";
import { format, addDays, isToday, isTomorrow, isAfter } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { ErrorBoundary } from "./ErrorBoundary";
import { DashboardSkeleton, BookingSkeleton } from "./LoadingSkeleton";
import { supabase } from "../integrations/supabase/client";
import { useStripeConnect } from "@/hooks/useStripeConnect";
import { StripeConnectModal } from "./StripeConnectModal";
import { ClaimStatusBadge } from "@/components/ClaimStatusBadge";
import OwnerClaimForm from "@/components/OwnerClaimForm";
import { RenterClaimForm } from "@/components/RenterClaimForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PickupLocationModal } from "@/components/PickupLocationModal";
import { BookingFlowGuard } from "@/components/BookingFlowGuard";
import { useNotifications } from "@/hooks/useNotifications";
import { useDeleteConversation } from "@/hooks/useMessages";

interface BookingData {
  id: string;
  status: string;
  payment_status: string;
  renter_id: string;
  owner_id: string;
  gear_id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  deposit_amount: number;
  gear: {
    title: string;
    price_per_day: number;
    deposit_amount: number;
    images: string[];
  };
  renter: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email: string;
  };
  owner: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

interface UserData {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
}

interface UserStats {
  total_earnings: number;
  total_spent: number;
  average_rating: number;
  total_reviews: number;
}

function getBookingBadges(booking: BookingData, userId: string) {
  const badges = [];
  const status = booking.status;
  const paymentStatus = booking.payment_status;

  // 1. Cancelled
  if (status === "cancelled") {
    badges.push(
      <Badge key="cancelled" variant="destructive">
        Anulată
      </Badge>,
    );
    if (paymentStatus === "refunded") {
      badges.push(
        <Badge
          key="refunded"
          variant="outline"
          className="bg-gray-100 text-gray-800 border-gray-200 ml-1"
        >
          Refundat
        </Badge>,
      );
    }
    return badges;
  }

  // 2. Completed
  if (status === "completed") {
    badges.push(
      <Badge
        key="completed"
        variant="default"
        className="bg-green-100 text-green-800"
      >
        Finalizată
      </Badge>,
    );
    return badges;
  }

  // 3. Pending status - show confirmation pending instead of payment pending
  if (status === "pending") {
    badges.push(
      <Badge
        key="pending"
        variant="outline"
        className="bg-orange-100 text-orange-800 border-orange-200"
      >
        În așteptare confirmare
      </Badge>,
    );
    return badges;
  }

  // 4. Active/Confirmed/Returned
  if (status === "confirmed") {
    badges.push(
      <Badge
        key="confirmed"
        variant="secondary"
        className="bg-blue-100 text-blue-800"
      >
        Confirmată
      </Badge>,
    );
  } else if (status === "active") {
    badges.push(
      <Badge
        key="active"
        variant="secondary"
        className="bg-blue-100 text-blue-800"
      >
        În curs
      </Badge>,
    );
  } else if (status === "returned") {
    badges.push(
      <Badge
        key="returned"
        variant="outline"
        className="bg-purple-100 text-purple-800 border-purple-200"
      >
        Returnat
      </Badge>,
    );
  }

  // 5. Payment status for active bookings (only show for non-pending statuses)
  if (paymentStatus === "completed" && status !== "completed") {
    badges.push(
      <Badge
        key="paid"
        variant="default"
        className="bg-green-100 text-green-800 ml-1"
      >
        Plătit
      </Badge>,
    );
  } else if (paymentStatus === "pending" && status !== "completed" && status !== "pending") {
    badges.push(
      <Badge
        key="pay-pending"
        variant="outline"
        className="bg-orange-100 text-orange-800 border-orange-200 ml-1"
      >
        În așteptare plată
      </Badge>,
    );
  }
  return badges;
}

export const Dashboard: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(
    profile?.avatar_url || "",
  );
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    location:
      profile?.location && profile.location !== "Unknown"
        ? profile.location
        : "",
  });

  // Stripe Connect integration
  const {
    connectedAccount,
    loading: stripeLoading,
    error: stripeError,
    setupStripeConnect,
    refreshAccountStatus,
  } = useStripeConnect();
  const [showStripeOnboarding, setShowStripeOnboarding] = useState(false);

  const { data: bookings = [], isLoading: bookingsLoading } = useUserBookings();
  const { data: listings = [], isLoading: listingsLoading } = useUserListings();
  const { data: reviews = [], isLoading: reviewsLoading } = useUserReviews();
  const { data: stats, isLoading: statsLoading } = useUserStats();

  // Filter bookings to separate user bookings (as renter) from owner bookings
  const userBookings = (bookings as Array<Record<string, unknown>>).filter(
    (booking) => booking.renter_id === user?.id,
  );
  const ownerBookings = (bookings as Array<Record<string, unknown>>).filter(
    (booking) => booking.owner_id === user?.id,
  );

  const { mutate: acceptBooking, isPending: acceptingBooking } =
    useAcceptBooking();
  const { mutate: rejectBooking, isPending: rejectingBooking } =
    useRejectBooking();
  const { mutate: confirmReturn, isPending: confirmingReturn } =
    useConfirmReturn();
  const { mutate: completeRental, isPending: completingRental } =
    useCompleteRental();
  const { mutate: deleteGear, isPending: deleteLoading } = useDeleteGear();
  const { mutate: deleteConversation } = useDeleteConversation();
  const { notifyBookingConfirmed, notifyGearDeleted } = useNotifications();

  const handleCompleteRental = (bookingId: string) => {
    completeRental(bookingId, {
      onSuccess: () => {
        deleteConversation(bookingId, {
          onSuccess: () => {
            toast({
              title: "Închiriere finalizată!",
              description:
                "Închirierea a fost finalizată cu succes și conversația a fost ștearsă.",
            });
          },
          onError: () => {
            toast({
              title: "Închiriere finalizată!",
              description: "Închirierea a fost finalizată cu succes.",
            });
          },
        });
      },
      onError: (error) => {
        toast({
          title: "Eroare la finalizarea închirierii",
          description:
            error.message || "A apărut o eroare la finalizarea închirierii.",
          variant: "destructive",
        });
      },
    });
  };

  const [editingGear, setEditingGear] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [deletingGearId, setDeletingGearId] = useState<string | null>(null);
  const [paymentBooking, setPaymentBooking] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [paymentTransaction, setPaymentTransaction] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [confirmationBooking, setConfirmationBooking] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [confirmationType, setConfirmationType] = useState<"pickup" | "return">(
    "pickup",
  );

  const [claimStatuses, setClaimStatuses] = useState<
    Record<string, "pending" | "approved" | "rejected">
  >({});
  const [claimBooking, setClaimBooking] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [pickupBooking, setPickupBooking] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState<string | null>(null);

  // Warning message state
  const [showStripeWarning, setShowStripeWarning] = useState(false);

  // Check if user should see the Stripe warning
  useEffect(() => {
    if (!user) return;

    const dismissedWarning = localStorage.getItem(
      `stripe-warning-dismissed-${user.id}`,
    );
    const hasListings = listings.length > 0;
    const isStripeConnected = connectedAccount?.charges_enabled;

    // Debug logging
    console.log("Warning debug:", {
      user: user.id,
      dismissedWarning,
      hasListings,
      isStripeConnected,
      listingsLength: listings.length,
      connectedAccount,
    });

    // Show warning if:
    // 1. Warning hasn't been dismissed
    // 2. AND either:
    //    - User has listings but no Stripe account configured
    //    - User has no listings yet (encourage them to become an owner)
    const shouldShowWarning =
      !dismissedWarning &&
      ((hasListings && !isStripeConnected) || !hasListings);

    console.log("Should show warning:", shouldShowWarning);
    setShowStripeWarning(shouldShowWarning);
  }, [
    user,
    listings.length,
    connectedAccount,
    connectedAccount?.charges_enabled,
  ]);

  const dismissStripeWarning = () => {
    if (user?.id) {
      localStorage.setItem(`stripe-warning-dismissed-${user.id}`, "true");
      setShowStripeWarning(false);
    }
  };

  // Load claim statuses for user bookings
  const loadClaims = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("claims")
      .select("id, booking_id, claim_status")
      .in("booking_id", [...bookings.map((b) => b.id)]);
    if (error) {
      console.error("Error loading claims", error);
      return;
    }
    const map: Record<string, "pending" | "approved" | "rejected"> = {};
    (data || []).forEach((c) => {
      map[c.booking_id] = c.claim_status;
    });
    setClaimStatuses(map);
  };

  // Sync local state with profile data
  useEffect(() => {
    if (profile) {
      setCurrentAvatarUrl(profile.avatar_url || "");
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        location:
          profile.location && profile.location !== "Unknown"
            ? profile.location
            : "",
      });
    }
  }, [profile]);

  // Force refetch all queries when user changes
  useEffect(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ["user-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["user-listings"] });
      queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["connected-account"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    }
  }, [user?.id, queryClient]);

  // Simple URL parameter handling
  useEffect(() => {
    const success = searchParams.get("success");
    const refresh = searchParams.get("refresh");

    if (success === "true" || refresh === "true") {
      const handleOnboardingCompletion = async () => {
        try {
          queryClient.invalidateQueries({ queryKey: ["connected-account"] });

          toast({
            title: "Configurare completă!",
            description: "Contul de plată a fost configurat cu succes.",
          });
        } catch (error) {
          console.error("Error handling onboarding completion:", error);
          toast({
            title: "Eroare la configurare",
            description: "A apărut o eroare la configurarea contului de plată.",
            variant: "destructive",
          });
        }
      };

      handleOnboardingCompletion();

      // Clear URL parameters
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);

  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["user-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["user-listings"] });
    queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
    queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    queryClient.invalidateQueries({ queryKey: ["connected-account"] });

    toast({
      title: "Date actualizate",
      description: "Toate datele au fost actualizate cu succes.",
    });
  };

  const handleSave = async () => {
    await updateProfile(formData);
    setIsEditing(false);
  };

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    setCurrentAvatarUrl(newAvatarUrl);
    updateProfile({ avatar_url: newAvatarUrl });
  };

  const handleBookingAction = (
    bookingId: string,
    status: "confirmed" | "rejected",
  ) => {
    if (status === "confirmed") {
      acceptBooking(
        { bookingId, pickupLocation: "To be set" },
        {
          onSuccess: () => {
            toast({
              title: "Rezervare confirmată!",
              description: "Rezervarea a fost confirmată cu succes.",
            });
            // Get the actual booking data to send proper notification
            const booking = userBookings.find(b => b.id === bookingId) || ownerBookings.find(b => b.id === bookingId);
            if (booking) {
              const gearTitle = (booking.gear as Record<string, unknown>)?.title as string || "Echipament necunoscut";
              const renterId = booking.renter_id as string;
              notifyBookingConfirmed(bookingId, gearTitle, renterId);
            }
          },
          onError: (error) => {
            toast({
              title: "Eroare la confirmarea rezervării",
              description:
                error.message || "A apărut o eroare la confirmarea rezervării.",
              variant: "destructive",
            });
          },
        },
      );
    } else {
      rejectBooking(bookingId, {
        onSuccess: () => {
          toast({
            title: "Rezervare respinsă",
            description: "Rezervarea a fost respinsă.",
          });
        },
        onError: (error) => {
          toast({
            title: "Eroare la respingerea rezervării",
            description:
              error.message || "A apărut o eroare la respingerea rezervării.",
            variant: "destructive",
          });
        },
      });
    }
  };

  const handleDeleteGear = async (gearId: string) => {
    deleteGear(gearId, {
      onSuccess: () => {
        toast({
          title: "Echipament șters!",
          description: "Echipamentul a fost șters cu succes.",
        });
        notifyGearDeleted("Gear Title", user?.id || "");
        setDeletingGearId(null);
      },
      onError: (error) => {
        toast({
          title: "Eroare la ștergerea echipamentului",
          description:
            error.message || "A apărut o eroare la ștergerea echipamentului.",
          variant: "destructive",
        });
        setDeletingGearId(null);
      },
    });
  };

  const handleConfirmation = (
    booking: Record<string, unknown>,
    type: "pickup" | "return",
  ) => {
    setConfirmationBooking(booking);
    setConfirmationType(type);
  };

  const handlePaymentClick = async (booking: Record<string, unknown>) => {
    setPaymentBooking(booking);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      pending: "secondary",
      confirmed: "default",
      active: "default",
      returned: "outline",
      completed: "default",
      cancelled: "destructive",
      rejected: "destructive",
    };

    return (
      <Badge variant={variants[status] || "secondary"} className="text-xs">
        {getStatusLabel(status)}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      pending: "secondary",
      paid: "default",
      refunded: "destructive",
      failed: "destructive",
      cancelled: "destructive",
    };
    return (
      <Badge variant={variants[status] || "secondary"} className="text-xs">
        {getPaymentStatusLabel(status)}
      </Badge>
    );
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "În așteptare",
      confirmed: "Confirmată",
      active: "Activă",
      returned: "Returnată",
      completed: "Finalizată",
      cancelled: "Anulată",
      rejected: "Respinse",
    };
    return labels[status] || status;
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "În așteptare",
      paid: "Plătit",
      refunded: "Refundat",
      failed: "Eșuat",
      cancelled: "Anulat",
    };
    return labels[status] || status;
  };

  const getUserDisplayName = (userData: UserData) => {
    if (!userData) return "Necunoscut";
    return (
      `${userData.first_name || ""} ${userData.last_name || ""}`.trim() ||
      userData.email ||
      "Necunoscut"
    );
  };

  // Calculate stats
  const activeBookings = userBookings.filter((b) =>
    ["confirmed", "active"].includes(b.status as string),
  ).length;
  const pendingBookings = userBookings.filter(
    (b) => b.status === "pending",
  ).length;
  const totalEarnings = (stats as UserStats)?.total_earnings || 0;
  const totalSpent = (stats as UserStats)?.total_spent || 0;
  const averageRating = (stats as UserStats)?.average_rating || 0;
  const totalReviews = (stats as UserStats)?.total_reviews || 0;

  // Calculate upcoming bookings
  const upcomingBookings = userBookings
    .filter((booking) => {
      const startDate = new Date(booking.start_date as string);
      return (
        isAfter(startDate, new Date()) &&
        ["confirmed", "active"].includes(booking.status as string)
      );
    })
    .sort(
      (a, b) =>
        new Date(a.start_date as string).getTime() -
        new Date(b.start_date as string).getTime(),
    );

  // Calculate earnings trend
  const earningsTrend = totalEarnings > 0 ? "up" : "down";
  const earningsChange = totalEarnings > 0 ? "+12%" : "0%";

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Header />

        {showStripeWarning && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-1">
                    Configurați contul de plată pentru a începe să câștigați!
                  </h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    Pentru a primi plăți pentru închirierile echipamentelor,
                    trebuie să configurați contul de plată Stripe. Acest proces
                    durează doar câteva minute și este necesar pentru a putea
                    primi banii în contul bancar.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => setShowStripeOnboarding(true)}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Configurare cont de plată
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/add-gear")}
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adaugă primul echipament
                    </Button>
                  </div>
                </div>
              </div>
              <button
                onClick={dismissStripeWarning}
                className="text-yellow-600 hover:text-yellow-800 p-1 rounded-full hover:bg-yellow-100 transition-colors"
                title="Închide"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <main className="container mx-auto px-4 py-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Rezervări active
                    </p>
                    {statsLoading ? (
                      <div className="h-6 bg-gray-200 rounded animate-pulse mb-1"></div>
                    ) : (
                      <p className="text-lg sm:text-xl font-bold text-gray-900">
                        {activeBookings}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {pendingBookings} în așteptare
                    </p>
                  </div>
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Câștiguri totale
                    </p>
                    {statsLoading ? (
                      <div className="h-6 bg-gray-200 rounded animate-pulse mb-1"></div>
                    ) : (
                      <p className="text-lg sm:text-xl font-bold text-gray-900">
                        {formatCurrency(totalEarnings)}
                      </p>
                    )}
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <p className="text-xs text-gray-500">{earningsChange}</p>
                    </div>
                  </div>
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Rating mediu
                    </p>
                    {statsLoading ? (
                      <div className="h-6 bg-gray-200 rounded animate-pulse mb-1"></div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <p className="text-lg sm:text-xl font-bold text-gray-900">
                          {averageRating.toFixed(1)}
                        </p>
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      {totalReviews} recenzii
                    </p>
                  </div>
                  <Award className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Echipamente
                    </p>
                    {statsLoading ? (
                      <div className="h-6 bg-gray-200 rounded animate-pulse mb-1"></div>
                    ) : (
                      <p className="text-lg sm:text-xl font-bold text-gray-900">
                        {listings.length}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {listings.filter((l) => l.is_available).length}{" "}
                      disponibile
                    </p>
                  </div>
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="bg-white mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Acțiuni rapide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  className="h-auto p-2 sm:p-3 flex flex-col items-center space-y-1 sm:space-y-2"
                  onClick={() => navigate("/add-gear")}
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  <span className="text-xs sm:text-sm font-medium">
                    Adaugă echipament
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-2 sm:p-3 flex flex-col items-center space-y-1 sm:space-y-2"
                  onClick={() => navigate("/browse")}
                >
                  <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <span className="text-xs sm:text-sm">Caută echipamente</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-2 sm:p-3 flex flex-col items-center space-y-1 sm:space-y-2"
                  onClick={() => setShowStripeOnboarding(true)}
                >
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  <span className="text-xs sm:text-sm">Configurare plată</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-2 sm:p-3 flex flex-col items-center space-y-1 sm:space-y-2"
                  onClick={() => navigate("/messages")}
                >
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  <span className="text-xs sm:text-sm">Mesaje</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Bookings Section */}
            <Card className="bg-white">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2">
                <CardTitle className="text-base sm:text-lg">
                  Rezervări recente
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/bookings")}
                  className="text-xs sm:text-sm"
                >
                  Vezi toate{" "}
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <BookingSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* All bookings consolidated - recent bookings for both renter and owner */}
                    {(() => {
                      const allBookings = [...userBookings, ...ownerBookings]
                        .sort(
                          (a, b) =>
                            new Date(
                              (b as Record<string, unknown>)
                                .created_at as string,
                            ).getTime() -
                            new Date(
                              (a as Record<string, unknown>)
                                .created_at as string,
                            ).getTime(),
                        )
                        .slice(0, 5); // Show up to 5 most recent bookings

                      if (allBookings.length > 0) {
                        return allBookings.map((booking) => {
                          const isOwner = booking.owner_id === user?.id;
                          const isPending = booking.status === "pending";

                          return (
                            <div
                              key={booking.id as string}
                              className={`p-3 border rounded-lg ${isPending ? "bg-orange-50 border-orange-200" : "hover:bg-gray-50"}`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                    <p className="font-medium text-sm truncate">
                                      {((
                                        booking.gear as Record<string, unknown>
                                      )?.title as string) ||
                                        "Echipament necunoscut"}
                                    </p>
                                    <Badge
                                      variant="outline"
                                      className="text-xs w-fit"
                                    >
                                      {isOwner ? "Ca proprietar" : "Ca chiriaș"}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-600">
                                    {format(
                                      new Date(booking.start_date as string),
                                      "dd MMM yyyy",
                                    )}{" "}
                                    -{" "}
                                    {format(
                                      new Date(booking.end_date as string),
                                      "dd MMM yyyy",
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-600 truncate">
                                    {isOwner
                                      ? `Chiriaș: ${getUserDisplayName(booking.renter as UserData)}`
                                      : `Proprietar: ${getUserDisplayName(booking.owner as UserData)}`}
                                  </p>
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    {getBookingBadges(booking, user?.id)}
                                    {(booking.activeClaim as Record<
                                      string,
                                      unknown
                                    >) && (
                                      <ClaimStatusBadge
                                        status={
                                          (
                                            booking.activeClaim as Record<
                                              string,
                                              unknown
                                            >
                                          ).claim_status as string
                                        }
                                        claim={booking.activeClaim}
                                        booking={booking}
                                        currentUserId={user?.id}
                                      />
                                    )}
                                    {(booking.resolvedClaim as Record<
                                      string,
                                      unknown
                                    >) &&
                                      !(booking.activeClaim as Record<
                                        string,
                                        unknown
                                      >) && (
                                        <ClaimStatusBadge
                                          status={
                                            (
                                              booking.resolvedClaim as Record<
                                                string,
                                                unknown
                                              >
                                            ).claim_status as string
                                          }
                                          claim={booking.resolvedClaim}
                                          booking={booking}
                                          currentUserId={user?.id}
                                        />
                                      )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => navigate("/bookings")}
                                      className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs px-2 py-1 h-7"
                                    >
                                      Vezi
                                    </Button>

                                    {/* Confirm button for pending owner bookings */}
                                    {isPending && isOwner && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() =>
                                          handleBookingAction(
                                            String(booking.id),
                                            "confirmed",
                                          )
                                        }
                                        disabled={acceptingBooking}
                                        className="bg-green-600 hover:bg-green-700 text-xs px-3 py-1 h-7"
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Confirmă
                                      </Button>
                                    )}

                                    {/* Claim buttons */}
                                    {!["pending", "cancelled"].includes(
                                      booking.status as string,
                                    ) &&
                                      user?.id === booking.renter_id && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setClaimBooking(booking)
                                          }
                                          className="text-red-600 border-red-200 hover:bg-red-50 text-xs px-2 py-1 h-7"
                                          title="Depune reclamare"
                                        >
                                          <AlertCircle className="h-3 w-3" />
                                        </Button>
                                      )}
                                    {[
                                      "confirmed",
                                      "active",
                                      "returned",
                                      "completed",
                                    ].includes(booking.status as string) &&
                                      (booking.payment_status as string) ===
                                        "completed" &&
                                      user?.id === booking.owner_id && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setClaimBooking(booking)
                                          }
                                          className="text-red-600 border-red-200 hover:bg-red-50 text-xs px-2 py-1 h-7"
                                          title="Depune reclamare"
                                        >
                                          <AlertCircle className="h-3 w-3" />
                                        </Button>
                                      )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      }

                      // Show empty state if no bookings
                      return (
                        <div className="text-center py-8">
                          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-600">
                            Nu ai rezervări
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/browse")}
                            className="mt-2"
                          >
                            Caută echipamente
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Listings Section */}
            <Card className="bg-white">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2">
                <CardTitle className="text-base sm:text-lg">
                  Echipamentele mele
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/my-listings")}
                  className="text-xs sm:text-sm"
                >
                  Vezi toate{" "}
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {listingsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <BookingSkeleton key={i} />
                    ))}
                  </div>
                ) : listings.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                      Nu ai echipamente încă
                    </h3>
                    <p className="text-xs text-gray-600 mb-4">
                      Adaugă primul tău echipament și începe să câștigi bani!
                    </p>
                    <Button
                      onClick={() => navigate("/add-gear")}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adaugă echipament
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {listings.slice(0, 3).map((listing) => (
                      <div
                        key={listing.id as string}
                        className="p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {listing.title as string}
                            </p>
                            <p className="text-xs text-gray-600">
                              {listing.price_per_day as number} RON/zi
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                listing.is_available ? "default" : "secondary"
                              }
                              className="text-xs"
                            >
                              {listing.is_available
                                ? "Disponibil"
                                : "Închiriat"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />

        {/* Modals */}
        {editingGear && (
          <EditGearModal
            isOpen={!!editingGear}
            gear={editingGear}
            onClose={() => setEditingGear(null)}
          />
        )}

        {reviewingBooking && (
          <ReviewModal
            isOpen={!!reviewingBooking}
            booking={reviewingBooking}
            onClose={() => setReviewingBooking(null)}
          />
        )}

        {paymentBooking && (
          <PaymentModal
            isOpen={!!paymentBooking}
            booking={paymentBooking as Record<string, unknown>}
            onClose={() => {
              setPaymentBooking(null);
              setPaymentTransaction(null);
            }}
          />
        )}

        {confirmationBooking && (
          <ConfirmationSystem
            isOpen={!!confirmationBooking}
            booking={confirmationBooking}
            type={confirmationType}
            onClose={() => setConfirmationBooking(null)}
          />
        )}

        {claimBooking && (
          <Dialog
            open={!!claimBooking}
            onOpenChange={() => setClaimBooking(null)}
          >
            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-lg sm:text-xl">
                  Revendicare daune
                </DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  {user?.id === claimBooking.owner_id
                    ? "Descrie daunele și încarcă dovezi foto."
                    : "Descrie problema întâlnită și încarcă dovezi foto."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {user?.id === claimBooking.owner_id ? (
                  <OwnerClaimForm
                    bookingId={String(claimBooking.id)}
                    onSubmitted={() => {
                      setClaimBooking(null);
                    }}
                  />
                ) : (
                  <RenterClaimForm
                    bookingId={String(claimBooking.id)}
                    onSubmitted={() => {
                      setClaimBooking(null);
                    }}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {pickupBooking && (
          <PickupLocationModal
            bookingId={String(pickupBooking.id)}
            isOpen={!!pickupBooking}
            onClose={() => setPickupBooking(null)}
            onSaved={() => {
              /* reload bookings */
            }}
          />
        )}

        <StripeConnectModal
          isOpen={showStripeOnboarding}
          onClose={() => setShowStripeOnboarding(false)}
        />

        {/* Booking Flow Guard Modal */}
        {showBookingFlow && (
          <Dialog
            open={!!showBookingFlow}
            onOpenChange={() => setShowBookingFlow(null)}
          >
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Procesul de închiriere</DialogTitle>
                <DialogDescription>
                  {(() => {
                    const booking = [...userBookings, ...ownerBookings].find(
                      (b) => b.id === showBookingFlow,
                    );
                    const isOwner = booking?.owner_id === user?.id;
                    return isOwner
                      ? "Procesul pentru proprietar"
                      : "Procesul pentru închiriator";
                  })()}
                </DialogDescription>
              </DialogHeader>
              {(() => {
                const booking = [...userBookings, ...ownerBookings].find(
                  (b) => b.id === showBookingFlow,
                );
                if (!booking) return null;

                const isOwner = booking.owner_id === user?.id;
                return (
                  <BookingFlowGuard
                    bookingId={String(booking.id)}
                    gearId={String(booking.gear_id)}
                    isOwner={isOwner}
                    currentStatus={String(booking.status)}
                    onStatusUpdate={(newStatus) => {
                      setShowBookingFlow(null);
                      queryClient.invalidateQueries({
                        queryKey: ["userBookings"],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["ownerBookings"],
                      });
                    }}
                  />
                );
              })()}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </ErrorBoundary>
  );
};
