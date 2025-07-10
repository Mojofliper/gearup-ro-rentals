import React, { useState, useCallback } from "react";
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
import { Loader2, Trash2, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  cleanupService,
  type CleanupStats,
  type CleanupResult,
} from "@/services/cleanupService";

export default function CleanupPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [lastCleanupResult, setLastCleanupResult] =
    useState<CleanupResult | null>(null);
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      const data = await cleanupService.getStats();
      setStats(data);
    } catch (error) {
      console.error("Error fetching cleanup stats:", error);
      toast({
        title: "Error",
        description: "Failed to fetch cleanup statistics",
        variant: "destructive",
      });
    }
  }, [toast]);

  const triggerCleanup = async () => {
    setIsLoading(true);
    try {
      const result = await cleanupService.triggerCleanup();
      setLastCleanupResult(result);
      toast({
        title: "Cleanup completed",
        description: `Successfully deleted ${result.deletedCount} stale pending bookings`,
      });
      // Refresh stats
      await fetchStats();
    } catch (error) {
      console.error("Error triggering cleanup:", error);
      toast({
        title: "Cleanup failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to trigger cleanup process",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch stats on component mount
  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Cleanup & Mentenanță
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Gestionare rezervări în așteptare și mentenanță sistem
          </p>
        </div>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Trash2 className="h-5 w-5" />
            Cleanup Rezervări în Așteptare
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Șterge automat rezervările în așteptare mai vechi de 48 de ore care
            nu au primit răspuns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total în Așteptare
                  </p>
                  <p className="text-xl font-bold text-blue-900">
                    {stats.totalPending}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Expirate (&gt;48h)
                  </p>
                  <p className="text-xl font-bold text-orange-900">
                    {stats.stalePending}
                  </p>
                </div>
              </div>
              {stats.lastCleanup && (
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Ultimul Cleanup
                    </p>
                    <p className="text-xl font-bold text-green-900">
                      {stats.lastCleanup.deletedCount} șterse
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Trigger */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h4 className="font-medium text-lg">Cleanup Manual</h4>
                <p className="text-sm text-gray-600">
                  Declanșează cleanup-ul imediat al rezervărilor expirate
                </p>
              </div>
              <Button
                onClick={triggerCleanup}
                disabled={isLoading}
                variant="destructive"
                className="w-full sm:w-auto rounded-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Se curăță...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Curăță Acum
                  </>
                )}
              </Button>
            </div>

            {/* Auto-schedule info */}
            <Alert className="rounded-xl">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Cleanup-ul automat rulează zilnic la 2:00 AM UTC. Rezervările în
                așteptare mai vechi de 48 de ore sunt șterse automat.
              </AlertDescription>
            </Alert>
          </div>

          {/* Last cleanup result */}
          {lastCleanupResult && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <h4 className="font-medium mb-4 text-lg">
                Rezultat Ultimul Cleanup
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Rezervări șterse:</span>
                  <Badge variant="secondary" className="rounded-lg">
                    {lastCleanupResult.deletedCount}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Timp limită:</span>
                  <span className="text-gray-600">
                    {new Date(lastCleanupResult.cutoffTime).toLocaleString()}
                  </span>
                </div>
                {lastCleanupResult.deletedBookings &&
                  lastCleanupResult.deletedBookings.length > 0 && (
                    <div>
                      <span className="block mb-2 font-medium">
                        ID-uri rezervări șterse:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {lastCleanupResult.deletedBookings
                          .slice(0, 5)
                          .map((booking: { id: string }) => (
                            <Badge
                              key={booking.id}
                              variant="outline"
                              className="text-xs rounded-lg"
                            >
                              {booking.id}
                            </Badge>
                          ))}
                        {lastCleanupResult.deletedBookings.length > 5 && (
                          <Badge
                            variant="outline"
                            className="text-xs rounded-lg"
                          >
                            +{lastCleanupResult.deletedBookings.length - 5} mai
                            multe
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
