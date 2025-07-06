-- Add missing tables that are referenced in the API but don't exist in schema

-- Handover photos table for booking pickup/return documentation
CREATE TABLE public.handover_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    photo_type TEXT NOT NULL CHECK (photo_type IN ('pickup_renter', 'pickup_owner', 'return_renter', 'return_owner')),
    photo_url TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_handover_photos_booking_id ON public.handover_photos(booking_id);
CREATE INDEX idx_handover_photos_uploaded_by ON public.handover_photos(uploaded_by);

-- Add RLS policies for handover_photos
ALTER TABLE public.handover_photos ENABLE ROW LEVEL SECURITY;

-- Users can view handover photos for their bookings
CREATE POLICY "Users can view handover photos for their bookings" ON public.handover_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = handover_photos.booking_id 
            AND (b.renter_id = auth.uid() OR b.owner_id = auth.uid())
        )
    );

-- Users can insert handover photos for their bookings
CREATE POLICY "Users can insert handover photos for their bookings" ON public.handover_photos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = handover_photos.booking_id 
            AND (b.renter_id = auth.uid() OR b.owner_id = auth.uid())
        )
        AND uploaded_by = auth.uid()
    );

-- Tell PostgREST to reload cached schema
NOTIFY pgrst, 'reload schema'; 