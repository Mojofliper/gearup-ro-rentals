-- Add payment_status to bookings table
ALTER TABLE public.bookings 
ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- Create transactions table for Stripe payments
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  amount INTEGER NOT NULL, -- total amount in RON cents
  platform_fee INTEGER NOT NULL, -- 13% platform fee in RON cents
  deposit_amount INTEGER NOT NULL, -- deposit amount in RON cents
  rental_amount INTEGER NOT NULL, -- rental amount in RON cents
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  stripe_charge_id TEXT,
  refund_amount INTEGER DEFAULT 0, -- amount refunded in RON cents
  refund_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for transactions
CREATE POLICY "Users can view transactions for their bookings" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = transactions.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can create transactions for their bookings" ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = transactions.booking_id 
      AND bookings.renter_id = auth.uid()
    )
  );

CREATE POLICY "System can update transaction status" ON public.transactions
  FOR UPDATE USING (true);

-- Add updated_at trigger for transactions
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add index for better performance
CREATE INDEX idx_transactions_booking_id ON public.transactions(booking_id);
CREATE INDEX idx_transactions_stripe_payment_intent_id ON public.transactions(stripe_payment_intent_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);

-- Add function to calculate platform fee (13%)
CREATE OR REPLACE FUNCTION public.calculate_platform_fee(rental_amount INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN ROUND(rental_amount * 0.13);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add function to validate payment amounts
CREATE OR REPLACE FUNCTION public.validate_payment_amounts(
  rental_amount INTEGER,
  deposit_amount INTEGER,
  platform_fee INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  -- Validate rental amount
  IF rental_amount IS NULL OR rental_amount <= 0 OR rental_amount > 100000000 THEN
    RETURN FALSE;
  END IF;
  
  -- Validate deposit amount (can be 0)
  IF deposit_amount IS NULL OR deposit_amount < 0 OR deposit_amount > 100000000 THEN
    RETURN FALSE;
  END IF;
  
  -- Validate platform fee
  IF platform_fee IS NULL OR platform_fee < 0 OR platform_fee > 100000000 THEN
    RETURN FALSE;
  END IF;
  
  -- Validate that platform fee is 13% of rental amount (with small tolerance for rounding)
  IF ABS(platform_fee - ROUND(rental_amount * 0.13)) > 1 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add trigger to validate transaction amounts
CREATE OR REPLACE FUNCTION public.validate_transaction_amounts()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.validate_payment_amounts(NEW.rental_amount, NEW.deposit_amount, NEW.platform_fee) THEN
    RAISE EXCEPTION 'Invalid payment amounts provided';
  END IF;
  
  -- Ensure total amount matches
  IF NEW.amount != (NEW.rental_amount + NEW.deposit_amount + NEW.platform_fee) THEN
    RAISE EXCEPTION 'Total amount does not match sum of components';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_transaction_amounts_trigger
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_amounts();

-- Add function to update booking payment status when transaction status changes
CREATE OR REPLACE FUNCTION public.update_booking_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update booking payment status based on transaction status
  IF NEW.status = 'completed' THEN
    UPDATE public.bookings 
    SET payment_status = 'paid'
    WHERE id = NEW.booking_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE public.bookings 
    SET payment_status = 'failed'
    WHERE id = NEW.booking_id;
  ELSIF NEW.status = 'refunded' THEN
    UPDATE public.bookings 
    SET payment_status = 'refunded'
    WHERE id = NEW.booking_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_booking_payment_status_trigger
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_booking_payment_status(); 