-- Update user creation trigger to always provide a fallback for full_name

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  safe_full_name TEXT;
BEGIN
  safe_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    concat_ws(' ', new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name'),
    new.email,
    'Unknown'
  );
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    safe_full_name
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 