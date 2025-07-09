-- Fix the booking notification trigger to use valid notification_type enum values
CREATE OR REPLACE FUNCTION notify_booking_created()
RETURNS TRIGGER AS $$
DECLARE
  gear_title TEXT;
  owner_name TEXT;
  renter_name TEXT;
BEGIN
  -- Get gear title
  SELECT title INTO gear_title
  FROM gear
  WHERE id = NEW.gear_id;
  
  -- Get owner name
  SELECT full_name INTO owner_name
  FROM users
  WHERE id = NEW.owner_id;
  
  -- Get renter name
  SELECT full_name INTO renter_name
  FROM users
  WHERE id = NEW.renter_id;
  
  -- Insert notification for owner
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    data,
    is_read,
    created_at
  ) VALUES (
    NEW.owner_id,
    'Rezervare nouă',
    COALESCE(gear_title, 'Echipament') || ' - Ai o rezervare nouă de la ' || COALESCE(renter_name, 'un utilizator'),
    'booking_request',
    jsonb_build_object(
      'bookingId', NEW.id,
      'gearTitle', COALESCE(gear_title, 'Echipament'),
      'action', 'created'
    ),
    false,
    NOW()
  );
  
  -- Insert notification for renter
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    data,
    is_read,
    created_at
  ) VALUES (
    NEW.renter_id,
    'Rezervare creată',
    'Rezervarea pentru ' || COALESCE(gear_title, 'Echipament') || ' a fost creată cu succes',
    'booking_request',
    jsonb_build_object(
      'bookingId', NEW.id,
      'gearTitle', COALESCE(gear_title, 'Echipament'),
      'action', 'created'
    ),
    false,
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION notify_booking_created() IS 'Automatically sends notifications to owner and renter when a new booking is created'; 