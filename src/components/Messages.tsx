
import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Send, Search, MoreVertical, Star } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

interface Conversation {
  id: string;
  participant: {
    name: string;
    avatar?: string;
    isOnline: boolean;
  };
  gear: {
    name: string;
    image: string;
    price: number;
  };
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: Message[];
}

export const Messages: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>('1');
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data pentru demonstrație
  const conversations: Conversation[] = [
    {
      id: '1',
      participant: {
        name: 'Maria Ionescu',
        isOnline: true
      },
      gear: {
        name: 'Sony A7 III',
        image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=100&h=100&fit=crop',
        price: 120
      },
      lastMessage: 'Perfect, ne vedem mâine la 10:00!',
      lastMessageTime: new Date(2024, 11, 20, 15, 30),
      unreadCount: 0,
      messages: [
        {
          id: '1',
          senderId: 'other',
          content: 'Salut! Sunt interesată de camera ta Sony A7 III pentru weekend-ul următor.',
          timestamp: new Date(2024, 11, 20, 14, 0),
          isRead: true
        },
        {
          id: '2',
          senderId: 'me',
          content: 'Salut Maria! Da, este disponibilă. Pentru ce tip de proiect ai nevoie de ea?',
          timestamp: new Date(2024, 11, 20, 14, 15),
          isRead: true
        },
        {
          id: '3',
          senderId: 'other',
          content: 'Am o ședință foto pentru o nuntă. Camera vine cu obiectivul kit?',
          timestamp: new Date(2024, 11, 20, 14, 30),
          isRead: true
        },
        {
          id: '4',
          senderId: 'me',
          content: 'Da, include obiectivul 28-70mm, plus baterie suplimentară și geanta. Preluarea se poate face în centrul Clujului.',
          timestamp: new Date(2024, 11, 20, 15, 0),
          isRead: true
        },
        {
          id: '5',
          senderId: 'other',
          content: 'Perfect, ne vedem mâine la 10:00!',
          timestamp: new Date(2024, 11, 20, 15, 30),
          isRead: true
        }
      ]
    },
    {
      id: '2',
      participant: {
        name: 'Alex Popescu',
        isOnline: false
      },
      gear: {
        name: 'Canon RF 85mm f/1.2',
        image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=100&h=100&fit=crop',
        price: 150
      },
      lastMessage: 'Mulțumesc pentru închiriere!',
      lastMessageTime: new Date(2024, 11, 19, 18, 45),
      unreadCount: 2,
      messages: [
        {
          id: '1',
          senderId: 'other',
          content: 'Mulțumesc pentru închiriere! Obiectivul a fost perfect pentru ședința foto.',
          timestamp: new Date(2024, 11, 19, 18, 45),
          isRead: false
        },
        {
          id: '2',
          senderId: 'other',
          content: 'Am lăsat o recenzie de 5 stele. O să îl mai închiriez cu siguranță!',
          timestamp: new Date(2024, 11, 19, 18, 46),
          isRead: false
        }
      ]
    }
  ];

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // În aplicația reală ar trimite mesajul prin API
    console.log('Sending message:', newMessage);
    setNewMessage('');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ro-RO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return formatTime(date);
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ieri';
    } else {
      return date.toLocaleDateString('ro-RO', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  const filteredConversations = conversations.filter(conversation =>
    conversation.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.gear.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Conversation List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Mesaje</span>
                <Badge variant="secondary">{conversations.length}</Badge>
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Caută conversații..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedConversation === conversation.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            {conversation.participant.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.participant.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium truncate">{conversation.participant.name}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(conversation.lastMessageTime)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2 mb-2">
                          <img
                            src={conversation.gear.image}
                            alt={conversation.gear.name}
                            className="w-6 h-6 rounded object-cover"
                          />
                          <span className="text-sm text-muted-foreground truncate">
                            {conversation.gear.name}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat Window */}
          <Card className="lg:col-span-2 flex flex-col">
            {currentConversation ? (
              <>
                {/* Chat Header */}
                <CardHeader className="flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {currentConversation.participant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{currentConversation.participant.name}</h3>
                          {currentConversation.participant.isOnline && (
                            <Badge variant="secondary" className="text-xs">Online</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <img
                            src={currentConversation.gear.image}
                            alt={currentConversation.gear.name}
                            className="w-4 h-4 rounded object-cover"
                          />
                          <span className="text-sm text-muted-foreground">
                            {currentConversation.gear.name} • {currentConversation.gear.price} RON/zi
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <Separator />

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderId === 'me'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.senderId === 'me' 
                            ? 'text-primary-foreground/70' 
                            : 'text-muted-foreground'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Scrie un mesaj..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Selectează o conversație</h3>
                  <p className="text-muted-foreground">
                    Alege o conversație din lista din stânga pentru a începe să comunici.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};
