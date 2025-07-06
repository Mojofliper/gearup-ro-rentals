-- Add missing tables that the API references but don't exist in schema

-- Connected accounts table for Stripe Connect integration
CREATE TABLE public.connected_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    stripe_account_id TEXT UNIQUE NOT NULL,
    account_status TEXT NOT NULL DEFAULT 'pending',
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    requirements_completed BOOLEAN DEFAULT FALSE,
    requirements_missing JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table for messaging system
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    participant1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    participant2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(booking_id, participant1_id, participant2_id)
);

-- Create indexes for performance
CREATE INDEX idx_connected_accounts_owner_id ON public.connected_accounts(owner_id);
CREATE INDEX idx_connected_accounts_stripe_account_id ON public.connected_accounts(stripe_account_id);
CREATE INDEX idx_conversations_booking_id ON public.conversations(booking_id);
CREATE INDEX idx_conversations_participants ON public.conversations(participant1_id, participant2_id);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at);

-- Add RLS policies for connected_accounts
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connected accounts" ON public.connected_accounts
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own connected accounts" ON public.connected_accounts
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own connected accounts" ON public.connected_accounts
    FOR UPDATE USING (owner_id = auth.uid());

-- Add RLS policies for conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations they participate in" ON public.conversations
    FOR SELECT USING (
        participant1_id = auth.uid() OR participant2_id = auth.uid()
    );

CREATE POLICY "Users can insert conversations they participate in" ON public.conversations
    FOR INSERT WITH CHECK (
        participant1_id = auth.uid() OR participant2_id = auth.uid()
    );

CREATE POLICY "Users can update conversations they participate in" ON public.conversations
    FOR UPDATE USING (
        participant1_id = auth.uid() OR participant2_id = auth.uid()
    );

-- Add triggers for updated_at
CREATE TRIGGER update_connected_accounts_updated_at 
    BEFORE UPDATE ON public.connected_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON public.conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tell PostgREST to reload cached schema
NOTIFY pgrst, 'reload schema'; 