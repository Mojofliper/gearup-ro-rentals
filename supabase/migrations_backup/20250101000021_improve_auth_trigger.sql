-- Improve auth trigger with better error handling and logging
-- This migration replaces the existing auth trigger with a more robust version

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved auth trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_full_name TEXT;
    v_user_id UUID;
BEGIN
    -- Get the user ID
    v_user_id := NEW.id;
    
    -- Extract full name from metadata
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        concat_ws(' ', 
            NEW.raw_user_meta_data->>'first_name', 
            NEW.raw_user_meta_data->>'last_name'
        ),
        'User' -- fallback name
    );
    
    -- Log the trigger execution
    RAISE LOG 'Auth trigger: Creating profile for user % with email % and name %', 
        v_user_id, NEW.email, v_full_name;
    
    -- Insert the user profile
    INSERT INTO public.users (id, email, full_name, created_at, updated_at)
    VALUES (
        v_user_id,
        NEW.email,
        v_full_name,
        NOW(),
        NOW()
    );
    
    -- Log successful creation
    RAISE LOG 'Auth trigger: Successfully created profile for user %', v_user_id;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        RAISE LOG 'Auth trigger: Error creating profile for user %: %', v_user_id, SQLERRM;
        
        -- Re-raise the error to prevent silent failures
        RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions to the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role; 