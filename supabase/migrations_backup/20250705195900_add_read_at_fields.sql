-- Add missing read_at fields to messages and notifications tables

-- Add read_at field to messages table
ALTER TABLE public.messages 
ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;

-- Add read_at field to notifications table  
ALTER TABLE public.notifications 
ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for read_at fields
CREATE INDEX idx_messages_read_at ON public.messages(read_at);
CREATE INDEX idx_notifications_read_at ON public.notifications(read_at);

-- Tell PostgREST to reload cached schema
NOTIFY pgrst, 'reload schema'; 