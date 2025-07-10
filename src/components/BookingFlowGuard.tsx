import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Camera,
  CheckCircle,
  Clock,
  AlertTriangle,
  MapPin,
  MessageSquare,
  Calendar,
  User,
} from "lucide-react";
import { PhotoDocumentation } from "./PhotoDocumentation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BookingFlowGuardProps {
  bookingId: string;
  gearId: string;
  isOwner: boolean;
  currentStatus: string;
  onStatusUpdate: (newStatus: string) => void;
}

interface FlowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
  completed: boolean;
  current: boolean;
}

export const BookingFlowGuard: React.FC<BookingFlowGuardProps> = ({
  bookingId,
  gearId,
  isOwner,
  currentStatus,
  onStatusUpdate,
}) => {
  const [photoDocumentationComplete, setPhotoDocumentationComplete] =
    useState(false);
  const [pickupConfirmed, setPickupConfirmed] = useState(false);
  const [handoverComplete, setHandoverComplete] = useState(false);
  const { toast } = useToast();

  // Define flow steps based on user role and current status
  const getFlowSteps = (): FlowStep[] => {
    if (isOwner) {
      return [
        {
          id: "photo-documentation",
          title: "Photo Documentation",
          description: "Upload photos of gear condition before handover",
          icon: <Camera className="h-4 w-4" />,
          required: true,
          completed: photoDocumentationComplete,
          current: currentStatus === "confirmed" && !photoDocumentationComplete,
        },
        {
          id: "pickup-location",
          title: "Set Pickup Location",
          description: "Confirm pickup location and time",
          icon: <MapPin className="h-4 w-4" />,
          required: true,
          completed: pickupConfirmed,
          current: photoDocumentationComplete && !pickupConfirmed,
        },
        {
          id: "handover",
          title: "Gear Handover",
          description: "Complete gear handover to renter",
          icon: <User className="h-4 w-4" />,
          required: true,
          completed: handoverComplete,
          current: pickupConfirmed && !handoverComplete,
        },
      ];
    } else {
      return [
        {
          id: "photo-documentation",
          title: "Photo Documentation",
          description: "Upload photos of gear condition upon pickup",
          icon: <Camera className="h-4 w-4" />,
          required: true,
          completed: photoDocumentationComplete,
          current: currentStatus === "confirmed" && !photoDocumentationComplete,
        },
        {
          id: "pickup-confirmation",
          title: "Confirm Pickup",
          description: "Confirm gear pickup and condition",
          icon: <CheckCircle className="h-4 w-4" />,
          required: true,
          completed: pickupConfirmed,
          current: photoDocumentationComplete && !pickupConfirmed,
        },
      ];
    }
  };

  const handlePhotoDocumentationComplete = () => {
    setPhotoDocumentationComplete(true);
    toast({
      title: "Photo documentation complete",
      description: "Photos have been uploaded successfully.",
    });
  };

  const handlePickupConfirmation = async () => {
    try {
      // Update booking status to 'picked_up'
      const response = await fetch("/api/update-booking-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          bookingId,
          status: "picked_up",
          pickupConfirmedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update booking status");
      }

      setPickupConfirmed(true);
      onStatusUpdate("picked_up");

      toast({
        title: "Pickup confirmed",
        description: "Gear pickup has been confirmed successfully.",
      });
    } catch (error) {
      console.error("Error confirming pickup:", error);
      toast({
        title: "Error",
        description: "Failed to confirm pickup. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleHandoverComplete = async () => {
    try {
      // Update booking status to 'active'
      const response = await fetch("/api/update-booking-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          bookingId,
          status: "active",
          handoverCompletedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update booking status");
      }

      setHandoverComplete(true);
      onStatusUpdate("active");

      toast({
        title: "Handover complete",
        description: "Gear handover has been completed successfully.",
      });
    } catch (error) {
      console.error("Error completing handover:", error);
      toast({
        title: "Error",
        description: "Failed to complete handover. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getCurrentStep = () => {
    const steps = getFlowSteps();
    return steps.find((step) => step.current) || steps[0];
  };

  const canProceedToNextStep = () => {
    const currentStep = getCurrentStep();
    return currentStep.completed;
  };

  const renderStepContent = () => {
    const currentStep = getCurrentStep();

    switch (currentStep.id) {
      case "photo-documentation":
        return (
          <PhotoDocumentation
            bookingId={bookingId}
            gearId={gearId}
            onComplete={handlePhotoDocumentationComplete}
            isOwner={isOwner}
          />
        );

      case "pickup-location":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Set Pickup Location
              </CardTitle>
              <CardDescription>
                Confirm the pickup location and time with the renter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Please coordinate with the renter to set a pickup location and
                  time. You can use the messaging system to arrange this.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Pickup Coordination</h4>
                  <p className="text-sm text-gray-600">
                    Use the messaging system to arrange pickup details
                  </p>
                </div>
                <Button
                  onClick={() => {
                    // Navigate to messages or open message modal
                    window.location.href = `/messages?booking=${bookingId}`;
                  }}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Open Messages
                </Button>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Pickup Requirements</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Both parties must be present for pickup</li>
                  <li>• Photo documentation must be completed</li>
                  <li>• Gear condition must be verified</li>
                  <li>• Rental agreement must be signed</li>
                </ul>
              </div>

              <Button
                onClick={handlePickupConfirmation}
                disabled={!canProceedToNextStep()}
                className="w-full"
              >
                Confirm Pickup Location Set
              </Button>
            </CardContent>
          </Card>
        );

      case "handover":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Gear Handover
              </CardTitle>
              <CardDescription>
                Complete the gear handover to the renter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All prerequisites have been completed. You can now proceed
                  with the gear handover.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium">Handover Checklist</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      Photo documentation completed
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Pickup location confirmed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Both parties present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Gear condition verified</span>
                  </div>
                </div>
              </div>

              <Button onClick={handleHandoverComplete} className="w-full">
                Complete Handover
              </Button>
            </CardContent>
          </Card>
        );

      case "pickup-confirmation":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Confirm Pickup
              </CardTitle>
              <CardDescription>
                Confirm that you have received the gear in good condition
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Please verify the gear condition matches the photos provided
                  by the owner. If there are any issues, contact support
                  immediately.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium">Pickup Verification</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Gear condition matches owner's photos</li>
                  <li>• All components are present and functional</li>
                  <li>• No damage or missing items</li>
                  <li>• Rental agreement terms understood</li>
                </ul>
              </div>

              <Button onClick={handlePickupConfirmation} className="w-full">
                Confirm Pickup & Start Rental
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const steps = getFlowSteps();
  const currentStep = getCurrentStep();

  return (
    <div className="space-y-6">
      {/* Flow Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Flow Progress</CardTitle>
          <CardDescription>
            {isOwner ? "Owner workflow" : "Renter workflow"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-4">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    step.completed
                      ? "bg-green-500 border-green-500 text-white"
                      : step.current
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-gray-100 border-gray-300 text-gray-500"
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`font-medium ${
                        step.current
                          ? "text-blue-600"
                          : step.completed
                            ? "text-green-600"
                            : "text-gray-500"
                      }`}
                    >
                      {step.title}
                    </h4>
                    {step.current && <Badge variant="secondary">Current</Badge>}
                    {step.completed && (
                      <Badge
                        variant="default"
                        className="bg-green-100 text-green-800"
                      >
                        Complete
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      {currentStep && <div>{renderStepContent()}</div>}
    </div>
  );
};
