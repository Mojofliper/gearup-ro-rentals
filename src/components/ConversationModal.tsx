
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url: string;
  };
}

interface ConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  gearId: string;
  ownerId: string;
  gearName: string;
  ownerName: string;
  ownerAvatar?: string;
}

export const ConversationModal: React.FC<ConversationModalProps> = ({
  isOpen,
  onClose,
  gearId,
  ownerId,
  gearName,
  ownerName,
  ownerAvatar
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      initializeConversation();
    }
  }, [isOpen, user, gearId]);

  const initializeConversation = async () => {
    setLoading(true);
    try {
      // First, check if there's an existing booking between these users for this gear
      const { data: existingBooking, error: bookingError } = await supabase
        .from('bookings')
        .select('id')
        .eq('gear_id', gearId)
        .eq('renter_id', user?.id)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (bookingError) {
        console.error('Error fetching booking:', bookingError);
        // Create a temporary booking for messaging
        await createTemporaryBooking();
      } else if (existingBooking && existingBooking.length > 0) {
        setBookingId(existingBooking[0].id);
        await fetchMessages(existingBooking[0].id);
      } else {
        // Create a new booking for messaging
        await createTemporaryBooking();
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut inițializa conversația.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemporaryBooking = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          gear_id: gearId,
          renter_id: user?.id,
          owner_id: ownerId,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          total_days: 1,
          total_amount: 0,
          deposit_amount: 0,
          status: 'pending',
          notes: 'Conversație inițiată pentru întrebări'
        })
        .select()
        .single();

      if (error) throw error;

      setBookingId(data.id);
      setMessages([]);
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  };

  const fetchMessages = async (bookingId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (full_name, avatar_url)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !bookingId || !user) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          booking_id: bookingId,
          sender_id: user.id,
        });

      if (error) throw error;

      setNewMessage('');
      await fetchMessages(bookingId);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut trimite mesajul.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={ownerAvatar} />
              <AvatarFallback>
                {ownerName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{ownerName}</div>
              <div className="text-sm text-gray-500">despre {gearName}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Messages */}
          <div className="h-64 overflow-y-auto border rounded-lg p-3 space-y-3">
            {loading ? (
              <div className="text-center text-gray-500">Se încarcă...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500">
                Începe o conversație despre acest echipament
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg ${
                      message.sender_id === user?.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-75 mt-1">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message input */}
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Scrie un mesaj..."
              disabled={sending || loading}
            />
            <Button 
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending || loading}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
