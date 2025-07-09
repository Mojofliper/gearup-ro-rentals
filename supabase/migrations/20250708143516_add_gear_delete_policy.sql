-- Add missing DELETE policy for gear table

-- Allow users to delete their own gear
CREATE POLICY "gear_delete_policy" ON "public"."gear" 
FOR DELETE USING (("auth"."uid"() = "owner_id"));

-- Also add a policy to allow service role to delete gear (for admin operations)
CREATE POLICY "service_role_can_delete_gear" ON "public"."gear" 
FOR DELETE USING (("auth"."role"() = 'service_role'));
