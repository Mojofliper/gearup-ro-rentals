import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Filter, 
  Clock, 
  CheckCheck, 
  MapPin, 
  Eye, 
  MoreVertical,
  ArrowLeft,
  Calendar,
  Settings
} from 'lucide-react';
import { sanitizeHtml, sanitizeText } from '@/utils/htmlSanitizer';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { isScamContent } from '@/utils/security';
import { MapCard } from '@/components/MapCard';
import { cn } from '@/lib/utils';
import { useSendMessage } from '@/hooks/useMessages';
import { format } from 'date-fns';

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
  message_type?: 'text' | 'image' | 'system';
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
  const { mutateAsync: sendMessageApi } = useSendMessage();

  const [uploading, setUploading] = useState(false);

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
                // Check if message already exists to avoid duplicates
                if (prev.some((msg) => msg.id === newMessage.id)) return prev;
                return [...prev, newMessage];
              });
              // Mark as read if conversation is open and message is from other user
              if (newMessage.sender_id !== user.id) {
                markMessagesAsRead();
              }
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
          sender:users!messages_sender_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('booking_id', selectedBooking)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data as unknown as Message[]);
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
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('booking_id', selectedBooking)
        .neq('sender_id', user.id);

      setUnreadConversations((prev) => ({ ...prev, [selectedBooking]: false }));
      setUnreadCounts((prev) => ({ ...prev, [selectedBooking]: 0 }));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedBooking || sending) return;

    setSending(true);
    try {
      // Optimistically add the message to the local state
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        content: newMessage.trim(),
        sender_id: user?.id || '',
        booking_id: selectedBooking,
        created_at: new Date().toISOString(),
        is_read: false,
        sender: {
          full_name: profile?.full_name || 'You',
          avatar_url: profile?.avatar_url
        },
        message_type: 'text'
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      
      // Send the message via API
      await sendMessageApi({
        bookingId: selectedBooking,
        content: newMessage.trim(),
      });
      
      // Remove the optimistic message and let the real-time update handle it
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
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
      handleSendMessage();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBooking) return;

    setUploading(true);
    try {
      // File upload logic would go here
      toast({
        title: 'Funcționalitate în dezvoltare',
        description: 'Încărcarea imaginilor va fi disponibilă în curând.',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut încărca fișierul.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'În așteptare';
      case 'confirmed': return 'Confirmată';
      case 'active': return 'Activă';
      case 'completed': return 'Finalizată';
      case 'cancelled': return 'Anulată';
      default: return status;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Se încarcă conversațiile...</h3>
              <p className="text-gray-600">Pregătim mesajele tale</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-6">
            <div className="relative">
              <MessageSquare className="h-20 w-20 text-gray-400 mx-auto" />
              <div className="absolute -top-2 -right-2 h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">!</span>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Trebuie să fii conectat</h3>
              <p className="text-gray-600 mb-6">Conectează-te pentru a vedea mesajele tale</p>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Conectează-te
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2 hover:bg-gray-100">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Înapoi</span>
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Mesaje</h1>
                  <p className="text-sm text-gray-600 hidden sm:block">Comunică cu proprietarii și chiriașii</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200">
                {bookings.length} conversații
              </Badge>
              <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {bookings.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-8">
              <div className="relative">
                <div className="h-24 w-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <MessageSquare className="h-12 w-12 text-gray-400" />
                </div>
                <div className="absolute -top-2 -right-2 h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">0</span>
                </div>
              </div>
              <div className="max-w-md">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Nu ai încă conversații</h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Creează o rezervare pentru a începe să comunici cu proprietarii și să coordonezi închirierile
                </p>
                <Link to="/browse">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300">
                    <Search className="h-4 w-4 mr-2" />
                    Caută echipamente
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
            {/* Modern Conversations Sidebar */}
            <div className="lg:col-span-1">
              <Card className="h-full flex flex-col bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="border-b border-gray-200/50 bg-gradient-to-r from-gray-50 to-blue-50/30">
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Caută conversații..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant={filterStatus === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus('all')}
                        className={cn(
                          "flex-1 transition-all duration-200",
                          filterStatus === 'all' 
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md" 
                            : "hover:bg-gray-50"
                        )}
                      >
                        Toate
                      </Button>
                      <Button
                        variant={filterStatus === 'pending' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus('pending')}
                        className={cn(
                          "flex-1 transition-all duration-200",
                          filterStatus === 'pending' 
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md" 
                            : "hover:bg-gray-50"
                        )}
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
                      const lastMessageDate = new Date(booking.start_date);
                      const isToday = new Date().toDateString() === lastMessageDate.toDateString();

                      return (
                        <div
                          key={booking.id}
                          className={cn(
                            "relative p-4 cursor-pointer transition-all duration-300 border-b border-gray-100/50 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50",
                            isSelected && "bg-gradient-to-r from-blue-100/80 to-purple-100/80 border-blue-200/50 shadow-sm"
                          )}
                          onClick={() => setSelectedBooking(booking.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="relative">
                              <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                                <AvatarImage src={gearImage} />
                                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold">
                                  {booking.gear?.title?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {hasUnread && (
                                <div className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                                  <span className="text-white text-xs font-bold">{unreadCount}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-semibold text-gray-900 truncate text-sm">
                                  {sanitizeText(booking.gear?.title || 'Echipament')}
                                </h4>
                                <span className="text-xs text-gray-500">
                                  {isToday ? 'Astăzi' : format(lastMessageDate, 'dd MMM')}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs border-0", getStatusColor(booking.status))}
                                >
                                  {getStatusText(booking.status)}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-blue-600">
                                  {formatPrice(booking.total_amount)}
                                </span>
                                <div className="flex items-center space-x-1 text-xs text-gray-500">
                                  <Calendar className="h-3 w-3" />
                                  <span>{format(new Date(booking.start_date), 'dd MMM')}</span>
                                </div>
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

            {/* Modern Messages Area */}
            <div className="lg:col-span-3">
              {selectedBooking ? (
                <Card className="h-full flex flex-col bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  {/* Enhanced Conversation Header */}
                  <CardHeader className="border-b border-gray-200/50 bg-gradient-to-r from-gray-50 to-blue-50/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                            <AvatarImage 
                              src={selectedBookingData?.gear?.gear_photos?.find(p => p.is_primary)?.photo_url} 
                            />
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold">
                              {selectedBookingData?.gear?.title?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">
                            {sanitizeText(selectedBookingData?.gear?.title || 'Echipament')}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(new Date(selectedBookingData?.start_date || ''), 'dd MMM')} - 
                                {format(new Date(selectedBookingData?.end_date || ''), 'dd MMM yyyy')}
                              </span>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={cn("border-0", getStatusColor(selectedBookingData?.status || ''))}
                            >
                              {getStatusText(selectedBookingData?.status || '')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link to={`/gear/${selectedBookingData?.gear_id}`} target="_blank">
                          <Button variant="outline" size="sm" className="hover:bg-blue-50 hover:text-blue-600">
                            <Eye className="h-4 w-4 mr-1" />
                            Vezi echipament
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Enhanced Pickup Location */}
                    {selectedBookingData?.pickup_lat && selectedBookingData?.pickup_lng && selectedBookingData?.pickup_location && (
                      <div className="mt-4 p-3 bg-white/60 rounded-lg border border-gray-200/50">
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-gray-800">Locație de ridicare</span>
                        </div>
                        <MapCard 
                          lat={selectedBookingData.pickup_lat} 
                          lng={selectedBookingData.pickup_lng} 
                          address={selectedBookingData.pickup_location}
                        />
                      </div>
                    )}
                  </CardHeader>

                  {/* Enhanced Messages */}
                  <CardContent className="flex-1 p-0 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50/30 to-white/30">
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center space-y-4">
                            <div className="h-16 w-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto">
                              <MessageSquare className="h-8 w-8 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-gray-600 font-medium">Nu există mesaje încă</p>
                              <p className="text-sm text-gray-500">Începe conversația!</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        messages.map((message, index) => {
                          if (message.message_type === 'system') {
                            // Convert markdown links to clickable HTML links
                            const contentWithLinks = message.content.replace(
                              /\[([^\]]+)\]\(([^)]+)\)/g,
                              '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>'
                            );
                            
                            return (
                              <div key={message.id} className="my-4 flex justify-center">
                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 text-blue-800 px-6 py-3 rounded-full text-sm max-w-lg w-fit shadow-sm">
                                  <span dangerouslySetInnerHTML={{ __html: contentWithLinks.replace(/\n/g, '<br/>') }} />
                                </div>
                              </div>
                            );
                          }
                          const isOwnMessage = message.sender_id === user?.id;
                          const showAvatar = !isOwnMessage;
                          const showTime = index === messages.length - 1 || 
                            new Date(message.created_at).getTime() - 
                            new Date(messages[index + 1]?.created_at || 0).getTime() > 300000; // 5 minutes

                          return (
                            <div
                              key={message.id}
                              className={cn(
                                "flex items-end space-x-3",
                                isOwnMessage ? "justify-end" : "justify-start"
                              )}
                            >
                              {showAvatar && (
                                <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                                  <AvatarImage src={message.sender?.avatar_url} />
                                  <AvatarFallback className="bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs">
                                    {message.sender?.full_name?.charAt(0).toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className={cn(
                                "flex flex-col max-w-xs lg:max-w-md",
                                isOwnMessage && "items-end"
                              )}>
                                <div className={cn(
                                  "px-4 py-3 rounded-2xl shadow-sm",
                                  isOwnMessage 
                                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md" 
                                    : "bg-white text-gray-900 rounded-bl-md border border-gray-200"
                                )}>
                                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                    {sanitizeText(message.content)}
                                  </p>
                                </div>
                                {showTime && (
                                  <div className={cn(
                                    "flex items-center space-x-1 mt-2 text-xs text-gray-500",
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
                                      <CheckCheck className="h-3 w-3 text-blue-400" />
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

                    {/* Enhanced Message Input */}
                    <div className="border-t border-gray-200/50 p-4 bg-white/80 backdrop-blur-sm">
                      <div className="flex items-end space-x-3">
                        <div className="flex-1 relative">
                          <Input
                            ref={inputRef}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Scrie un mesaj..."
                            maxLength={1000}
                            disabled={sending || uploading}
                            className="pr-24 resize-none bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-full"
                          />
                          <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                            <input type="file" accept="image/*" style={{ display: 'none' }} id="message-upload-input" onChange={handleFileChange} />
                            <label htmlFor="message-upload-input">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-100" asChild>
                                <svg className="h-3 w-3 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                              </Button>
                            </label>
                          </div>
                        </div>
                        <Button 
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || sending || uploading}
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300 rounded-full h-10 w-10 p-0"
                        >
                          {sending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
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
                <Card className="h-full flex items-center justify-center bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="text-center space-y-6">
                    <div className="h-20 w-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto">
                      <MessageSquare className="h-10 w-10 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-3">
                        Selectează o conversație
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
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
