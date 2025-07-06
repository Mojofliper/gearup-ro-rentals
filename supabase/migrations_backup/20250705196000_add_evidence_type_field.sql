-- Add missing evidence_type field to claim_photos table

-- Add evidence_type field to claim_photos table
ALTER TABLE public.claim_photos 
ADD COLUMN evidence_type TEXT;

-- Create index for evidence_type field
CREATE INDEX idx_claim_photos_evidence_type ON public.claim_photos(evidence_type);

-- Tell PostgREST to reload cached schema
NOTIFY pgrst, 'reload schema'; 