import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  BellOff, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Smartphone,
  Desktop,
  Calendar,
  MessageSquare,
  Star,
  CreditCard,
  Gift
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { pushNotificationService } from '@/services/pushNotificationService';
import { toast } from 'sonner';

interface PushNotificationSetupProps {
  className?: string;
}

export const PushNotificationSetup: React.FC<PushNotificationSetupProps> = ({ className }) => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [notificationSettings, setNotificationSettings] = useState({
    bookingUpdates: true,
    messages: true,
    reviews: true,
    payments: true,
    promotions: false
  });

  useEffect(() => {
    checkSupport();
    checkPermission();
    checkSubscription();
  }, []);

  const checkSupport = () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
  };

  const checkPermission = () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  };

  const checkSubscription = async () => {
    if (!isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setSubscription(existingSubscription);
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Notificările nu sunt suportate în acest browser');
      return;
    }

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Permisiunea pentru notificări a fost acordată!');
        await subscribeToPush();
      } else if (result === 'denied') {
        toast.error('Permisiunea pentru notificări a fost refuzată');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Eroare la solicitarea permisiunii');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToPush = async () => {
    if (!isSupported || !user) return;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from environment or API
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      // Convert VAPID key to Uint8Array
      const vapidKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push notifications
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey
      });

      setSubscription(pushSubscription);
      setIsSubscribed(true);

      // Save subscription to backend
      await saveSubscriptionToBackend(pushSubscription);

      toast.success('Te-ai abonat cu succes la notificări!');
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Eroare la abonarea la notificări');
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!subscription) return;

    setIsLoading(true);
    try {
      await subscription.unsubscribe();
      setSubscription(null);
      setIsSubscribed(false);

      // Remove subscription from backend
      await removeSubscriptionFromBackend();

      toast.success('Te-ai dezabonat de la notificări');
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Eroare la dezabonarea de la notificări');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSubscriptionToBackend = async (pushSubscription: PushSubscription) => {
    if (!user) return;

    try {
      const { error } = await pushNotificationService.saveSubscription({
        user_id: user.id,
        endpoint: pushSubscription.endpoint,
        p256dh: arrayBufferToBase64(pushSubscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(pushSubscription.getKey('auth')!),
        settings: notificationSettings
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
      throw error;
    }
  };

  const removeSubscriptionFromBackend = async () => {
    if (!user) return;

    try {
      const { error } = await pushNotificationService.removeSubscription(user.id);
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error removing subscription:', error);
      throw error;
    }
  };

  const updateNotificationSettings = async (setting: string, enabled: boolean) => {
    const newSettings = {
      ...notificationSettings,
      [setting]: enabled
    };
    
    setNotificationSettings(newSettings);

    if (isSubscribed && user) {
      try {
        await pushNotificationService.updateSettings(user.id, newSettings);
        toast.success('Setările de notificări au fost actualizate');
      } catch (error) {
        console.error('Error updating settings:', error);
        toast.error('Eroare la actualizarea setărilor');
      }
    }
  };



  // Utility functions
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const getStatusBadge = () => {
    if (!isSupported) {
      return <Badge variant="destructive">Nu suportat</Badge>;
    }
    
    if (permission === 'denied') {
      return <Badge variant="destructive">Permisiune refuzată</Badge>;
    }
    
    if (permission === 'granted' && isSubscribed) {
      return <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Activ
      </Badge>;
    }
    
    if (permission === 'granted' && !isSubscribed) {
      return <Badge variant="secondary">Neabonat</Badge>;
    }
    
    return <Badge variant="outline">Permisiune necesară</Badge>;
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificări Push
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Nu suportat</AlertTitle>
            <AlertDescription>
              Notificările push nu sunt suportate în acest browser sau pe acest dispozitiv.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificări Push
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status Permisiune</span>
            <span className="text-sm text-gray-600 capitalize">{permission}</span>
          </div>
          
          {permission === 'default' && (
            <Button 
              onClick={requestPermission} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Se procesează...' : 'Solicită Permisiunea'}
            </Button>
          )}
        </div>

        {/* Subscription Status */}
        {permission === 'granted' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Abonament</span>
              <span className="text-sm text-gray-600">
                {isSubscribed ? 'Activ' : 'Inactiv'}
              </span>
            </div>
            
            {!isSubscribed ? (
              <Button 
                onClick={subscribeToPush} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Se abonează...' : 'Activează Notificările'}
              </Button>
            ) : (
              <Button 
                variant="outline"
                onClick={unsubscribeFromPush} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Se dezabonează...' : 'Dezactivează Notificările'}
              </Button>
            )}
          </div>
        )}

        {/* Notification Settings */}
        {isSubscribed && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Tipuri de Notificări</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Actualizări rezervări</span>
                  </div>
                  <Switch
                    checked={notificationSettings.bookingUpdates}
                    onCheckedChange={(checked) => updateNotificationSettings('bookingUpdates', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm">Mesaje noi</span>
                  </div>
                  <Switch
                    checked={notificationSettings.messages}
                    onCheckedChange={(checked) => updateNotificationSettings('messages', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    <span className="text-sm">Recenzii noi</span>
                  </div>
                  <Switch
                    checked={notificationSettings.reviews}
                    onCheckedChange={(checked) => updateNotificationSettings('reviews', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm">Actualizări plăți</span>
                  </div>
                  <Switch
                    checked={notificationSettings.payments}
                    onCheckedChange={(checked) => updateNotificationSettings('payments', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    <span className="text-sm">Promoții</span>
                  </div>
                  <Switch
                    checked={notificationSettings.promotions}
                    onCheckedChange={(checked) => updateNotificationSettings('promotions', checked)}
                  />
                </div>
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Notificările push te vor informa despre activități importante</p>
          <p>• Poți dezactiva notificările oricând din setările browserului</p>
          <p>• Funcționează pe desktop și mobile</p>
        </div>
      </CardContent>
    </Card>
  );
}; 