-- Create a robust function to ensure a user profile exists for the current user
create or replace function public.ensure_user_profile()
returns void as $$
begin
  insert into public.users (id, email, full_name)
  select
    auth.uid(),
    (select email from auth.users where id = auth.uid()),
    coalesce(
      (select raw_user_meta_data->>'full_name' from auth.users where id = auth.uid()),
      (select email from auth.users where id = auth.uid()),
      'Unknown'
    )
  on conflict (id) do nothing;
end;
$$ language plpgsql security definer; 