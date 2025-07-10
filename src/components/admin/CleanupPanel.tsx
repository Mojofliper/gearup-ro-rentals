import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cleanupService, type CleanupStats, type CleanupResult } from '@/services/cleanupService'

export default function CleanupPanel() {
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<CleanupStats | null>(null)
  const [lastCleanupResult, setLastCleanupResult] = useState<CleanupResult | null>(null)
  const { toast } = useToast()

  const fetchStats = async () => {
    try {
      const data = await cleanupService.getStats()
      setStats(data)
    } catch (error) {
      console.error('Error fetching cleanup stats:', error)
      toast({
        title: "Error",
        description: "Failed to fetch cleanup statistics",
        variant: "destructive",
      })
    }
  }

  const triggerCleanup = async () => {
    setIsLoading(true)
    try {
      const result = await cleanupService.triggerCleanup()
      setLastCleanupResult(result)
      toast({
        title: "Cleanup completed",
        description: `Successfully deleted ${result.deletedCount} stale pending bookings`,
      })
      // Refresh stats
      await fetchStats()
    } catch (error) {
      console.error('Error triggering cleanup:', error)
      toast({
        title: "Cleanup failed",
        description: error instanceof Error ? error.message : "Failed to trigger cleanup process",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch stats on component mount
  React.useEffect(() => {
    fetchStats()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Cleanup Stale Pending Bookings
        </CardTitle>
        <CardDescription>
          Automatically delete pending bookings older than 48 hours that haven't been responded to
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Pending</p>
                <p className="font-semibold text-blue-900">{stats.totalPending}</p>
              </div>
            </div>
                          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Stale (&gt;48h)</p>
                  <p className="font-semibold text-orange-900">{stats.stalePending}</p>
                </div>
              </div>
            {stats.lastCleanup && (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Last Cleanup</p>
                  <p className="font-semibold text-green-900">{stats.lastCleanup.deletedCount} deleted</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual Trigger */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Manual Cleanup</h4>
              <p className="text-sm text-gray-600">
                Trigger immediate cleanup of stale pending bookings
              </p>
            </div>
            <Button 
              onClick={triggerCleanup} 
              disabled={isLoading}
              variant="destructive"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clean Now
                </>
              )}
            </Button>
          </div>

          {/* Auto-schedule info */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Automatic cleanup runs daily at 2:00 AM UTC. Pending bookings older than 48 hours are automatically deleted.
            </AlertDescription>
          </Alert>
        </div>

        {/* Last cleanup result */}
        {lastCleanupResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Last Cleanup Result</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Deleted bookings:</span>
                <Badge variant="secondary">{lastCleanupResult.deletedCount}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Cutoff time:</span>
                <span className="text-gray-600">
                  {new Date(lastCleanupResult.cutoffTime).toLocaleString()}
                </span>
              </div>
              {lastCleanupResult.deletedBookings && lastCleanupResult.deletedBookings.length > 0 && (
                <div>
                  <span className="block mb-1">Deleted booking IDs:</span>
                  <div className="flex flex-wrap gap-1">
                    {lastCleanupResult.deletedBookings.slice(0, 5).map((booking: any) => (
                      <Badge key={booking.id} variant="outline" className="text-xs">
                        {booking.id}
                      </Badge>
                    ))}
                    {lastCleanupResult.deletedBookings.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{lastCleanupResult.deletedBookings.length - 5} more
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
  )
} 