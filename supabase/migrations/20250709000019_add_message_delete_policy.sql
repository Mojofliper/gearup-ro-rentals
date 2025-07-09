-- Allow users to delete their own messages or messages for bookings they are a participant in
CREATE POLICY "Users can delete their own messages or booking messages" ON public.messages
  FOR DELETE USING (
    auth.uid() = sender_id
    OR EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = messages.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  ); 