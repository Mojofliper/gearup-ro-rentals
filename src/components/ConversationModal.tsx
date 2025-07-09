
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, X, Image as ImageIcon, Paperclip } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { useSendMessage } from '@/hooks/useMessages';


interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_type?: 'text' | 'image' | 'system';
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
  ownerAvatar: string;
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
  const { notifyNewMessage } = useNotifications();
  const { mutateAsync: sendMessageApi } = useSendMessage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);


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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !bookingId || !user) return;

    setSending(true);
    try {
      await sendMessageApi({ 
        bookingId: bookingId, 
        content: newMessage.trim(), 
        messageType: 'text' 
      });

      setNewMessage('');
      await fetchMessages(bookingId);
      toast({ title: 'Mesaj trimis', description: 'Mesajul a fost trimis cu succes.' });
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bookingId || !user) return;

    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from('message-uploads').upload(filePath, file);
      if (error) throw error;
      
      const { publicUrl } = supabase.storage.from('message-uploads').getPublicUrl(filePath).data;
      if (!publicUrl) throw new Error('Could not get file URL');
      
      await sendMessageApi({ bookingId: bookingId, content: publicUrl, messageType: 'image' });
      toast({ title: 'Imagine trimisă', description: 'Imaginea a fost trimisă cu succes.' });
      await fetchMessages(bookingId);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({ title: 'Eroare', description: 'Nu s-a putut încărca imaginea.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };



  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
              messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                const isSystemMessage = message.message_type === 'system';
                
                if (isSystemMessage) {
                  return (
                    <div key={message.id} className="text-center">
                      <div className="inline-block bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                        {message.content}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      isOwnMessage ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg ${
                        isOwnMessage
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {message.message_type === 'image' ? (
                        <img 
                          src={message.content} 
                          alt="Uploaded image" 
                          className="max-w-full rounded"
                        />
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                      <p className="text-xs opacity-75 mt-1">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message input */}
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Scrie un mesaj..."
                disabled={sending || loading || uploading}
                className="pr-20"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={sending || loading || uploading}
                  />
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </label>
              </div>
            </div>
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending || loading || uploading}
              size="sm"
            >
              {sending || uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>


        </div>
      </DialogContent>
    </Dialog>
  );
};
