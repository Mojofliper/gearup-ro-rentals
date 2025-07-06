import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onAvatarUpdate: (newAvatarUrl: string) => void;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({ 
  currentAvatarUrl, 
  onAvatarUpdate 
}) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!user) return;

    try {
      setUploading(true);

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (error) {
        toast({
          title: 'Eroare',
          description: error.message || 'Nu s-a putut încărca avatarul',
          variant: 'destructive',
        });
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        toast({
          title: 'Eroare',
          description: updateError.message || 'Nu s-a putut actualiza profilul',
          variant: 'destructive',
        });
        throw updateError;
      }

      // Update local state
      onAvatarUpdate(publicUrl);
      toast({
        title: 'Succes',
        description: 'Avatar actualizat cu succes!',
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut încărca avatarul',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="flex items-center space-x-4">
      <Avatar className="h-20 w-20">
        <AvatarImage src={currentAvatarUrl} />
        <AvatarFallback className="text-2xl">
          {user?.email?.charAt(0)?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          className="cursor-pointer"
          onClick={handleButtonClick}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {uploading ? 'Se încarcă...' : 'Schimbă avatar'}
        </Button>
        <Input
          id="avatar-upload"
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleUpload(e.target.files[0]);
            }
          }}
          disabled={uploading}
        />
        <p className="text-xs text-gray-500">
          Formateurile acceptate: JPG, PNG, WebP, GIF (max 5MB)
        </p>
      </div>
    </div>
  );
};
