import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface ConnectedAccount {
  id: string;
  owner_id: string;
  stripe_account_id: string;
  account_status: "pending" | "active" | "restricted" | "connect_required";
  charges_enabled: boolean;
  payouts_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const useStripeConnect = () => {
  const { user } = useAuth();
  const [connectedAccount, setConnectedAccount] =
    useState<ConnectedAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch connected account status
  const fetchConnectedAccount = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 is "not found" error, which is expected if no account exists
        throw fetchError;
      }

      setConnectedAccount(data);
    } catch (err: unknown) {
      console.error("Error fetching connected account:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Setup Stripe Connect account
  const setupStripeConnect = async () => {
    if (!user?.id || !user?.email) {
      throw new Error("User information required");
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        "https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/stripe-connect-setup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            country: "RO",
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to setup Stripe Connect");
      }

      const data = await response.json();

      if (data.requiresConnectSetup) {
        // Show message that Connect needs to be enabled
        setError(data.error || "Stripe Connect setup required");
        return data;
      } else if (data.onboardingUrl) {
        // Redirect to Stripe onboarding (no need to store account ID)
        window.location.href = data.onboardingUrl;
      } else {
        // Account already exists, refresh data
        await fetchConnectedAccount();
      }

      return data;
    } catch (err: unknown) {
      console.error("Error setting up Stripe Connect:", err);
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Check account status (for webhook updates)
  const refreshAccountStatus = async () => {
    await fetchConnectedAccount();
  };

  useEffect(() => {
    if (user?.id) {
      fetchConnectedAccount();
    }
  }, [user?.id]);

  return {
    connectedAccount,
    loading,
    error,
    setupStripeConnect,
    refreshAccountStatus,
  };
};
