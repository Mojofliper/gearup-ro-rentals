import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Send, 
  MessageSquare, 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  User,
  Search,
  Filter,
  MoreVertical,
  Image as ImageIcon,
  Paperclip,
  Smile,
  Mic,
  Check,
  CheckCheck
} from 'lucide-react';
import { sanitizeHtml, sanitizeText } from '@/utils/htmlSanitizer';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { isScamContent } from '@/utils/security';
import { MapCard } from '@/components/MapCard';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  booking_id: string;
  created_at: string;
  is_read: boolean;
  sender?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface Booking {
  id: string;
  gear_id: string;
  gear: {
    title: string;
    gear_photos?: Array<{ photo_url: string; is_primary: boolean }>;
  };
  start_date: string;
  end_date: string;
  status: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  pickup_location?: string | null;
  renter_id: string;
  owner_id: string;
  total_amount: number;
}

export const Messages: React.FC = () => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [unreadConversations, setUnreadConversations] = useState<{[bookingId: string]: boolean}>({});
  const [unreadCounts, setUnreadCounts] = useState<{[bookingId: string]: number}>({});
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  useEffect(() => {
    if (selectedBooking) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [selectedBooking]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!user || bookings.length === 0) return;
    
    const channels = bookings.map((booking) =>
      supabase
        .channel(`messages-${booking.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `booking_id=eq.${booking.id}`,
          },
          (payload) => {
            const newMessage = payload.new as Message;
            if (String(booking.id) === String(selectedBooking)) {
              setMessages((prev) => {
                if (prev.some((msg) => msg.id === newMessage.id)) return prev;
                return [...prev, newMessage];
              });
              // Mark as read if conversation is open
              markMessagesAsRead();
            } else if (newMessage.sender_id !== user.id) {
              setUnreadConversations((prev) => ({ ...prev, [booking.id]: true }));
              setUnreadCounts((prev) => ({ 
                ...prev, 
                [booking.id]: (prev[booking.id] || 0) + 1 
              }));
              toast({
                title: 'Mesaj nou',
                description: `Ai un mesaj nou la rezervarea "${sanitizeText(booking.gear?.title || 'Echipament')}"!`,
              });
            }
          }
        )
        .subscribe()
    );

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [user, bookings, selectedBooking]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          gear_id,
          start_date,
          end_date,
          status,
          pickup_lat,
          pickup_lng,
          pickup_location,
          renter_id,
          owner_id,
          total_amount,
          gear:gear_id (
            title,
            gear_photos(photo_url, is_primary)
          )
        `)
        .or(`renter_id.eq.${user?.id},owner_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data as unknown as Booking[]);
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
          sender:users!messages_sender_id_fkey (full_name, avatar_url)
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

  const markMessagesAsRead = async () => {
    if (!selectedBooking || !user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('booking_id', selectedBooking)
        .neq('sender_id', user.id);

      if (error) throw error;
      
      setUnreadConversations((prev) => ({ ...prev, [selectedBooking]: false }));
      setUnreadCounts((prev) => ({ ...prev, [selectedBooking]: 0 }));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedBooking || !user) return;

    const sanitizedContent = sanitizeText(newMessage.trim());
    
    // Scam guard
    const booking = bookings.find(b => b.id === selectedBooking);
    const bookingSafe = booking && (booking.status === 'active' || booking.status === 'completed');
    if (!bookingSafe && isScamContent(sanitizedContent)) {
      toast({
        title: 'Informații de contact blocate',
        description: 'Nu poți partaja email/telefon până când rezervarea este confirmată.',
        variant: 'destructive',
      });
      return;
    }

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
      inputRef.current?.focus();
      
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmată';
      case 'pending': return 'În așteptare';
      case 'active': return 'Activă';
      case 'completed': return 'Finalizată';
      case 'cancelled': return 'Anulată';
      default: return status;
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.gear?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || booking.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const selectedBookingData = bookings.find(b => b.id === selectedBooking);
  const isOwner = selectedBookingData?.owner_id === user?.id;
  const otherUserId = isOwner ? selectedBookingData?.renter_id : selectedBookingData?.owner_id;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 text-lg">Se încarcă conversațiile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <MessageSquare className="h-16 w-16 text-gray-400 mx-auto" />
          <h3 className="text-xl font-semibold text-gray-700">Trebuie să fii conectat</h3>
          <p className="text-gray-600">Conectează-te pentru a vedea mesajele tale.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/browse">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Înapoi</span>
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mesaje</h1>
                <p className="text-sm text-gray-600">Comunică cu proprietarii și chiriașii</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                {bookings.length} conversații
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {bookings.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-6">
              <div className="relative">
                <MessageSquare className="h-20 w-20 text-gray-300 mx-auto" />
                <div className="absolute -top-2 -right-2 h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-sm font-semibold">0</span>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Nu ai încă conversații</h3>
                <p className="text-gray-600 mb-6">Creează o rezervare pentru a începe să comunici</p>
                <Link to="/browse">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Caută echipamente
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
            {/* Conversations Sidebar */}
            <div className="lg:col-span-1">
              <Card className="h-full flex flex-col">
                <CardHeader className="border-b border-gray-200">
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Caută conversații..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant={filterStatus === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus('all')}
                        className="flex-1"
                      >
                        Toate
                      </Button>
                      <Button
                        variant={filterStatus === 'pending' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus('pending')}
                        className="flex-1"
                      >
                        În așteptare
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    {filteredBookings.map((booking) => {
                      const hasUnread = unreadConversations[booking.id];
                      const unreadCount = unreadCounts[booking.id] || 0;
                      const isSelected = selectedBooking === booking.id;
                      const gearImage = booking.gear?.gear_photos?.find(p => p.is_primary)?.photo_url;

                      return (
                        <div
                          key={booking.id}
                          className={cn(
                            "relative p-4 cursor-pointer transition-all duration-200 border-b border-gray-100 hover:bg-gray-50",
                            isSelected && "bg-purple-50 border-purple-200"
                          )}
                          onClick={() => setSelectedBooking(booking.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={gearImage} />
                              <AvatarFallback className="bg-purple-100 text-purple-600">
                                {booking.gear?.title?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900 truncate">
                                  {sanitizeText(booking.gear?.title || 'Echipament')}
                                </h4>
                                {hasUnread && (
                                  <Badge className="bg-red-500 text-white text-xs">
                                    {unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", getStatusColor(booking.status))}
                                >
                                  {getStatusText(booking.status)}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {new Date(booking.start_date).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 mt-1">
                                <span className="text-sm font-medium text-purple-600">
                                  {booking.total_amount} RON
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Messages Area */}
            <div className="lg:col-span-3">
              {selectedBooking ? (
                <Card className="h-full flex flex-col">
                  {/* Conversation Header */}
                  <CardHeader className="border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage 
                            src={selectedBookingData?.gear?.gear_photos?.find(p => p.is_primary)?.photo_url} 
                          />
                          <AvatarFallback className="bg-purple-100 text-purple-600">
                            {selectedBookingData?.gear?.title?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {sanitizeText(selectedBookingData?.gear?.title || 'Echipament')}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(selectedBookingData?.start_date || '').toLocaleDateString()} - 
                                {new Date(selectedBookingData?.end_date || '').toLocaleDateString()}
                              </span>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={getStatusColor(selectedBookingData?.status || '')}
                            >
                              {getStatusText(selectedBookingData?.status || '')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link to={`/gear/${selectedBookingData?.gear_id}`} target="_blank">
                          <Button variant="outline" size="sm">
                            Vezi echipament
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Pickup Location */}
                    {selectedBookingData?.pickup_lat && selectedBookingData?.pickup_lng && selectedBookingData?.pickup_location && (
                      <div className="mt-4">
                        <MapCard 
                          lat={selectedBookingData.pickup_lat} 
                          lng={selectedBookingData.pickup_lng} 
                          address={selectedBookingData.pickup_location}
                        />
                      </div>
                    )}
                  </CardHeader>

                  {/* Messages */}
                  <CardContent className="flex-1 p-0 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center space-y-4">
                            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto" />
                            <p className="text-gray-500">Nu există mesaje încă.</p>
                            <p className="text-sm text-gray-400">Începe conversația!</p>
                          </div>
                        </div>
                      ) : (
                        messages.map((message, index) => {
                          const isOwnMessage = message.sender_id === user?.id;
                          const showAvatar = !isOwnMessage;
                          const showTime = index === messages.length - 1 || 
                            new Date(message.created_at).getTime() - 
                            new Date(messages[index + 1]?.created_at || 0).getTime() > 300000; // 5 minutes

                          return (
                            <div
                              key={message.id}
                              className={cn(
                                "flex items-end space-x-2",
                                isOwnMessage ? "justify-end" : "justify-start"
                              )}
                            >
                              {showAvatar && (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={message.sender?.avatar_url} />
                                  <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                                    {message.sender?.full_name?.charAt(0).toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className={cn(
                                "flex flex-col max-w-xs lg:max-w-md",
                                isOwnMessage && "items-end"
                              )}>
                                <div className={cn(
                                  "px-4 py-2 rounded-2xl",
                                  isOwnMessage 
                                    ? "bg-purple-600 text-white rounded-br-md" 
                                    : "bg-gray-100 text-gray-900 rounded-bl-md"
                                )}>
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {sanitizeText(message.content)}
                                  </p>
                                </div>
                                {showTime && (
                                  <div className={cn(
                                    "flex items-center space-x-1 mt-1 text-xs text-gray-500",
                                    isOwnMessage && "justify-end"
                                  )}>
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {new Date(message.created_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                    {isOwnMessage && (
                                      <CheckCheck className="h-3 w-3 text-purple-600" />
                                    )}
                                  </div>
                                )}
                              </div>
                              {!showAvatar && isOwnMessage && (
                                <div className="w-8" /> // Spacer for alignment
                              )}
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="border-t border-gray-200 p-4 bg-white">
                      <div className="flex items-end space-x-3">
                        <div className="flex-1 relative">
                          <Input
                            ref={inputRef}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Scrie un mesaj..."
                            maxLength={1000}
                            disabled={sending}
                            className="pr-20 resize-none"
                          />
                          <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Smile className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Paperclip className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <Button 
                          onClick={sendMessage}
                          disabled={!newMessage.trim() || sending}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {sending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{newMessage.length}/1000 caractere</span>
                        <span>Apasă Enter pentru a trimite</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center space-y-4">
                    <MessageSquare className="h-16 w-16 text-gray-300 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        Selectează o conversație
                      </h3>
                      <p className="text-gray-600">
                        Alege o rezervare din lista din stânga pentru a începe să comunici
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
