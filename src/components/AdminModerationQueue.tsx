import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock,
  User,
  Package,
  MessageSquare,
  Flag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ModerationItem {
  id: string;
  type: 'gear' | 'review' | 'message' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  reported_by?: string;
  created_at: string;
  data: Record<string, unknown>;
}

interface ModerationQueueProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminModerationQueue: React.FC<ModerationQueueProps> = ({
  isOpen,
  onClose
}) => {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadModerationQueue();
    }
  }, [isOpen]);

  const loadModerationQueue = async () => {
    try {
      setLoading(true);
      
      // Load pending moderation items
      const { data, error } = await supabase
        .from('moderation_queue')
        .select(`
          *,
          reported_by_user:reported_by(email, first_name, last_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading moderation queue:', error);
        toast({
          title: "Error",
          description: "Failed to load moderation queue.",
          variant: "destructive",
        });
        return;
      }

      setItems(data || []);
    } catch (error) {
      console.error('Error loading moderation queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item: ModerationItem) => {
    try {
      const { error } = await supabase
        .from('moderation_queue')
        .update({
          status: 'approved',
          moderated_at: new Date().toISOString(),
          moderated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', item.id);

      if (error) {
        throw error;
      }

      // Update the item in the original table based on type
      await updateOriginalItem(item, 'approved');

      toast({
        title: "Item approved",
        description: "The item has been approved successfully.",
      });

      loadModerationQueue();
    } catch (error) {
      console.error('Error approving item:', error);
      toast({
        title: "Error",
        description: "Failed to approve item.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (item: ModerationItem) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('moderation_queue')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          moderated_at: new Date().toISOString(),
          moderated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', item.id);

      if (error) {
        throw error;
      }

      // Update the item in the original table based on type
      await updateOriginalItem(item, 'rejected');

      toast({
        title: "Item rejected",
        description: "The item has been rejected successfully.",
      });

      setRejectionReason('');
      setShowRejectionDialog(false);
      setSelectedItem(null);
      loadModerationQueue();
    } catch (error) {
      console.error('Error rejecting item:', error);
      toast({
        title: "Error",
        description: "Failed to reject item.",
        variant: "destructive",
      });
    }
  };

  const updateOriginalItem = async (item: ModerationItem, status: 'approved' | 'rejected') => {
    try {
      switch (item.type) {
        case 'gear':
          await supabase
            .from('gear')
            .update({ 
              status: status === 'approved' ? 'available' : 'suspended',
              moderation_status: status
            })
            .eq('id', item.data.gear_id);
          break;

        case 'review':
          await supabase
            .from('reviews')
            .update({ 
              status: status === 'approved' ? 'published' : 'hidden',
              moderation_status: status
            })
            .eq('id', item.data.review_id);
          break;

        case 'message':
          await supabase
            .from('messages')
            .update({ 
              status: status === 'approved' ? 'delivered' : 'blocked',
              moderation_status: status
            })
            .eq('id', item.data.message_id);
          break;

        case 'user':
          await supabase
            .from('profiles')
            .update({ 
              status: status === 'approved' ? 'active' : 'suspended',
              moderation_status: status
            })
            .eq('id', item.data.user_id);
          break;
      }
    } catch (error) {
      console.error('Error updating original item:', error);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'gear':
        return <Package className="h-4 w-4" />;
      case 'review':
        return <MessageSquare className="h-4 w-4" />;
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      default:
        return <Flag className="h-4 w-4" />;
    }
  };

  const getItemTitle = (item: ModerationItem) => {
    switch (item.type) {
      case 'gear':
        return `Gear: ${item.data.title || 'Untitled'}`;
      case 'review':
        return `Review for: ${item.data.gear_title || 'Unknown gear'}`;
      case 'message':
        return `Message in booking: ${item.data.booking_id}`;
      case 'user':
        return `User: ${item.data.email || 'Unknown user'}`;
      default:
        return 'Unknown item';
    }
  };

  const getItemDescription = (item: ModerationItem) => {
    switch (item.type) {
      case 'gear':
        return item.data.description || 'No description provided';
      case 'review':
        return item.data.comment || 'No comment provided';
      case 'message':
        return item.data.content || 'No content provided';
      case 'user':
        return `Reported for: ${item.reason || 'No reason provided'}`;
      default:
        return 'No description available';
    }
  };

  const groupedItems = {
    gear: items.filter(item => item.type === 'gear'),
    reviews: items.filter(item => item.type === 'review'),
    messages: items.filter(item => item.type === 'message'),
    users: items.filter(item => item.type === 'user')
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Moderation Queue
          </DialogTitle>
          <DialogDescription>
            Review and moderate reported content and users
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All ({items.length})
              </TabsTrigger>
              <TabsTrigger value="gear">
                Gear ({groupedItems.gear.length})
              </TabsTrigger>
              <TabsTrigger value="reviews">
                Reviews ({groupedItems.reviews.length})
              </TabsTrigger>
              <TabsTrigger value="messages">
                Messages ({groupedItems.messages.length})
              </TabsTrigger>
              <TabsTrigger value="users">
                Users ({groupedItems.users.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {items.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No items pending moderation.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <ModerationItemCard
                      key={item.id}
                      item={item}
                      onApprove={() => handleApprove(item)}
                      onReject={() => {
                        setSelectedItem(item);
                        setShowRejectionDialog(true);
                      }}
                      onView={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="gear" className="space-y-4">
              {groupedItems.gear.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No gear items pending moderation.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {groupedItems.gear.map((item) => (
                    <ModerationItemCard
                      key={item.id}
                      item={item}
                      onApprove={() => handleApprove(item)}
                      onReject={() => {
                        setSelectedItem(item);
                        setShowRejectionDialog(true);
                      }}
                      onView={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="space-y-4">
              {groupedItems.reviews.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No reviews pending moderation.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {groupedItems.reviews.map((item) => (
                    <ModerationItemCard
                      key={item.id}
                      item={item}
                      onApprove={() => handleApprove(item)}
                      onReject={() => {
                        setSelectedItem(item);
                        setShowRejectionDialog(true);
                      }}
                      onView={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="messages" className="space-y-4">
              {groupedItems.messages.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No messages pending moderation.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {groupedItems.messages.map((item) => (
                    <ModerationItemCard
                      key={item.id}
                      item={item}
                      onApprove={() => handleApprove(item)}
                      onReject={() => {
                        setSelectedItem(item);
                        setShowRejectionDialog(true);
                      }}
                      onView={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              {groupedItems.users.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No users pending moderation.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {groupedItems.users.map((item) => (
                    <ModerationItemCard
                      key={item.id}
                      item={item}
                      onApprove={() => handleApprove(item)}
                      onReject={() => {
                        setSelectedItem(item);
                        setShowRejectionDialog(true);
                      }}
                      onView={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Rejection Dialog */}
        <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Item</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this item.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectionDialog(false);
                    setSelectedItem(null);
                    setRejectionReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => selectedItem && handleReject(selectedItem)}
                >
                  Reject
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

interface ModerationItemCardProps {
  item: ModerationItem;
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
}

const ModerationItemCard: React.FC<ModerationItemCardProps> = ({
  item,
  onApprove,
  onReject,
  onView
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getItemIcon(item.type)}
            <CardTitle className="text-lg">{getItemTitle(item)}</CardTitle>
            <Badge variant="outline">{item.type}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            {new Date(item.created_at).toLocaleDateString()}
          </div>
        </div>
        <CardDescription>
          {getItemDescription(item)}
        </CardDescription>
        {item.reason && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Report Reason:</strong> {item.reason}
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={onView}>
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
          <Button variant="outline" size="sm" onClick={onApprove}>
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button variant="destructive" size="sm" onClick={onReject}>
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 