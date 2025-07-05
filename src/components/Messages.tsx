import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, MessageSquare, ArrowLeft } from 'lucide-react';
import { sanitizeHtml, sanitizeText } from '@/utils/htmlSanitizer';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  booking_id: string;
  created_at: string;
  is_read: boolean;
  sender?: {
    full_name: string;
  };
}

interface Booking {
  id: string;
  gear: {
    name: string;
  };
  start_date: string;
  end_date: string;
  status: string;
}

export const Messages: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  useEffect(() => {
    if (selectedBooking) {
      fetchMessages();
    }
  }, [selectedBooking]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          start_date,
          end_date,
          status,
          gear:gear_id (name)
        `)
        .or(`renter_id.eq.${user?.id},owner_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut încărca rezervările.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedBooking) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (full_name)
        `)
        .eq('booking_id', selectedBooking)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut încărca mesajele.',
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedBooking || !user) return;

    // Sanitize input on client side
    const sanitizedContent = sanitizeText(newMessage.trim());
    
    if (sanitizedContent.length === 0) {
      toast({
        title: 'Mesaj invalid',
        description: 'Mesajul nu poate fi gol.',
        variant: 'destructive',
      });
      return;
    }

    if (sanitizedContent.length > 1000) {
      toast({
        title: 'Mesaj prea lung',
        description: 'Mesajul nu poate depăși 1000 de caractere.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content: sanitizedContent,
          booking_id: selectedBooking,
          sender_id: user.id,
        });

      if (error) throw error;

      setNewMessage('');
      fetchMessages();
      
      toast({
        title: 'Mesaj trimis',
        description: 'Mesajul a fost trimis cu succes.',
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut trimite mesajul.',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Se încarcă mesajele...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Trebuie să fii conectat pentru a vedea mesajele.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/">
          <Button variant="ghost" size="sm" className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Înapoi acasă</span>
          </Button>
        </Link>
        <div className="text-center flex-1">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Mesaje</h2>
          <p className="text-gray-600">Comunică cu proprietarii și chiriașii</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nu ai încă nicio rezervare.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bookings list */}
          <Card>
            <CardHeader>
              <CardTitle>Rezervările tale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedBooking === booking.id
                      ? 'bg-purple-100 border-purple-300'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedBooking(booking.id)}
                >
                  <p className="font-medium text-sm">{sanitizeText(booking.gear?.name || 'Echipament')}</p>
                  <p className="text-xs text-gray-600">
                    {new Date(booking.start_date).toLocaleDateString()} - 
                    {new Date(booking.end_date).toLocaleDateString()}
                  </p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {booking.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Messages */}
          <div className="lg:col-span-2">
            {selectedBooking ? (
              <Card className="h-96 flex flex-col">
                <CardHeader>
                  <CardTitle>Conversație</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                    {messages.length === 0 ? (
                      <p className="text-gray-500 text-center">Nu există mesaje încă.</p>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.sender_id === user?.id
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-200 text-gray-800'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">
                              {sanitizeText(message.content)}
                            </p>
                            <p className="text-xs opacity-75 mt-1">
                              {new Date(message.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Scrie un mesaj..."
                      maxLength={1000}
                      disabled={sending}
                    />
                    <Button 
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <CardContent className="text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Selectează o rezervare pentru a vedea mesajele.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
