-- Create claims table for dispute resolution
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  claimant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('damage', 'late_return', 'missing_item', 'other')),
  description TEXT NOT NULL,
  evidence_photos JSONB, -- Array of photo URLs
  admin_notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
  resolution TEXT,
  deposit_penalty INTEGER DEFAULT 0, -- Amount withheld from deposit in RON cents
  admin_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Create photo_uploads table for handover photos
CREATE TABLE public.photo_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('pickup_renter', 'pickup_owner', 'return_renter', 'return_owner', 'claim_evidence')),
  photo_url TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  metadata JSONB -- Additional photo metadata (camera info, location, etc.)
);

-- Create message_threads table for messaging system
CREATE TABLE public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  participant1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(participant1_id, participant2_id, booking_id)
);

-- Add indexes for better performance
CREATE INDEX idx_claims_booking_id ON public.claims(booking_id);
CREATE INDEX idx_claims_status ON public.claims(status);
CREATE INDEX idx_claims_claimant_id ON public.claims(claimant_id);

CREATE INDEX idx_photo_uploads_booking_id ON public.photo_uploads(booking_id);
CREATE INDEX idx_photo_uploads_uploaded_by ON public.photo_uploads(uploaded_by);
CREATE INDEX idx_photo_uploads_photo_type ON public.photo_uploads(photo_type);

CREATE INDEX idx_message_threads_booking_id ON public.message_threads(booking_id);
CREATE INDEX idx_message_threads_participants ON public.message_threads(participant1_id, participant2_id);

-- Enable RLS on new tables
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

-- RLS policies for claims
CREATE POLICY "Users can view claims for their bookings" ON public.claims
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = claims.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can create claims for their bookings" ON public.claims
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = claims.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

CREATE POLICY "Admins can update claims" ON public.claims
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS policies for photo_uploads
CREATE POLICY "Users can view photos for their bookings" ON public.photo_uploads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = photo_uploads.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can upload photos for their bookings" ON public.photo_uploads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = photo_uploads.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

-- RLS policies for message_threads
CREATE POLICY "Users can view their message threads" ON public.message_threads
  FOR SELECT USING (
    participant1_id = auth.uid() OR participant2_id = auth.uid()
  );

CREATE POLICY "Users can create message threads" ON public.message_threads
  FOR INSERT WITH CHECK (
    participant1_id = auth.uid() OR participant2_id = auth.uid()
  );

-- Add updated_at triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.message_threads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add function to validate claim evidence
CREATE OR REPLACE FUNCTION public.validate_claim_evidence(evidence_photos JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if evidence_photos is not null and is an array
  IF evidence_photos IS NULL OR jsonb_typeof(evidence_photos) != 'array' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if array has at least one photo
  IF jsonb_array_length(evidence_photos) < 1 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if all elements are strings (URLs)
  FOR i IN 0..jsonb_array_length(evidence_photos)-1 LOOP
    IF jsonb_typeof(evidence_photos->i) != 'string' THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add trigger to validate claim evidence
CREATE OR REPLACE FUNCTION public.validate_claim_evidence_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.evidence_photos IS NOT NULL AND NOT public.validate_claim_evidence(NEW.evidence_photos) THEN
    RAISE EXCEPTION 'Invalid claim evidence format';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_claim_evidence_trigger
  BEFORE INSERT OR UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.validate_claim_evidence_trigger();

-- Add function to auto-resolve claims when admin updates status
CREATE OR REPLACE FUNCTION public.auto_resolve_claim()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is changed to resolved, set resolved_at timestamp
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_resolve_claim_trigger
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.auto_resolve_claim();