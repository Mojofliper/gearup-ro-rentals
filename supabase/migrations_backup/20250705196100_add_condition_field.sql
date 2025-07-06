-- Add missing condition field to gear table

-- Add condition field to gear table
ALTER TABLE public.gear 
ADD COLUMN condition TEXT DEFAULT 'good';

-- Create index for condition field
CREATE INDEX idx_gear_condition ON public.gear(condition);

-- Tell PostgREST to reload cached schema
NOTIFY pgrst, 'reload schema'; 