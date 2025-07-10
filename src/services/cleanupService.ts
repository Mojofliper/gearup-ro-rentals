import { supabase } from "@/integrations/supabase/client";

export interface CleanupStats {
  totalPending: number;
  stalePending: number;
  lastCleanup?: {
    timestamp: string;
    deletedCount: number;
  };
  cutoffTime: string;
}

export interface CleanupResult {
  success: boolean;
  message: string;
  deletedCount: number;
  cutoffTime: string;
  deletedBookings?: Array<{
    id: string;
    created_at: string;
    gear_id: string;
  }>;
}

export const cleanupService = {
  // Fetch cleanup statistics
  async getStats(): Promise<CleanupStats> {
    try {
      // Get total pending bookings
      const { count: totalPending } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Calculate cutoff time (48 hours ago)
      const cutoffTime = new Date(
        Date.now() - 48 * 60 * 60 * 1000,
      ).toISOString();

      // Get stale pending bookings (older than 48 hours)
      const { count: stalePending } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .lt("created_at", cutoffTime);

      // Get last cleanup information from a cleanup_logs table (if it exists)
      let lastCleanup = null;
      try {
        const { data: cleanupLogs } = await supabase
          .from("cleanup_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1);

        if (cleanupLogs && cleanupLogs.length > 0) {
          lastCleanup = {
            timestamp: cleanupLogs[0].created_at,
            deletedCount: cleanupLogs[0].deleted_count || 0,
          };
        }
      } catch (error) {
        // cleanup_logs table doesn't exist, that's okay
        console.log("Cleanup logs table not available");
      }

      return {
        totalPending: totalPending || 0,
        stalePending: stalePending || 0,
        lastCleanup,
        cutoffTime,
      };
    } catch (error) {
      console.error("Error fetching cleanup stats:", error);
      throw new Error("Failed to fetch cleanup statistics");
    }
  },

  // Trigger manual cleanup
  async triggerCleanup(): Promise<CleanupResult> {
    try {
      const { data, error } = await supabase.functions.invoke(
        "cleanup-pending-bookings",
        {
          method: "POST",
        },
      );

      if (error) {
        console.error("Error triggering cleanup:", error);
        throw new Error(error.message || "Failed to trigger cleanup");
      }

      return data as CleanupResult;
    } catch (error) {
      console.error("Error in cleanup service:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to trigger cleanup",
      );
    }
  },

  // Get cleanup logs (if available)
  async getCleanupLogs(limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from("cleanup_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching cleanup logs:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching cleanup logs:", error);
      return [];
    }
  },
};
