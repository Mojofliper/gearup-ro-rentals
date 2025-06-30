import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Send, Search, MoreVertical, ArrowLeft } from 'lucide-react';

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
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConversationList, setShowConversationList] = useState(true);

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

  const handleConversationSelect = (id: string) => {
    setSelectedConversation(id);
    setShowConversationList(false);
  };

  const handleBackToList = () => {
    setShowConversationList(true);
    setSelectedConversation(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      <Header />
      
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-200px)] max-h-[600px]">
          {/* Mobile: Show conversation list OR chat, Desktop: Show both */}
          <div className={`${showConversationList ? 'block' : 'hidden lg:block'} w-full lg:w-1/3`}>
            <Card className="h-full">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span>Mesaje</span>
                  <Badge variant="secondary">{conversations.length}</Badge>
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Caută conversații..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-gray-200 focus:border-purple-500"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => handleConversationSelect(conversation.id)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedConversation === conversation.id ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                              {conversation.participant.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          {conversation.participant.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium truncate text-gray-800">{conversation.participant.name}</p>
                            <span className="text-xs text-gray-500">
                              {formatDate(conversation.lastMessageTime)}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2 mb-2">
                            <img
                              src={conversation.gear.image}
                              alt={conversation.gear.name}
                              className="w-6 h-6 rounded object-cover"
                            />
                            <span className="text-sm text-gray-600 truncate">
                              {conversation.gear.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 truncate">
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
          </div>

          {/* Chat Window */}
          <div className={`${!showConversationList ? 'block' : 'hidden lg:block'} w-full lg:w-2/3`}>
            <Card className="h-full flex flex-col">
              {currentConversation ? (
                <>
                  {/* Chat Header */}
                  <CardHeader className="flex-shrink-0 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleBackToList}
                          className="lg:hidden p-2"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                            {currentConversation.participant.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-800">{currentConversation.participant.name}</h3>
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
                            <span className="text-sm text-gray-600">
                              {currentConversation.gear.name} • {currentConversation.gear.price} RON/zi
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="hidden sm:flex">
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
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.senderId === 'me' 
                              ? 'text-purple-100' 
                              : 'text-gray-500'
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
                        className="flex-1 border-gray-200 focus:border-purple-500"
                      />
                      <Button 
                        onClick={handleSendMessage} 
                        disabled={!newMessage.trim()}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">Selectează o conversație</h3>
                    <p className="text-gray-600">
                      Alege o conversație din lista din {showConversationList ? 'jos' : 'stânga'} pentru a începe să comunici.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};
