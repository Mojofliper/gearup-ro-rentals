import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const { booking_id, file_name, photo_type } = await req.json();
  if (!booking_id || !file_name || !["pickup", "return"].includes(photo_type)) {
    return new Response("Bad request", { status: 400 });
  }
  // create unique path
  const path = `${booking_id}/${photo_type}/${crypto.randomUUID()}-${file_name}`;
  const { data, error } = await supabase.storage
    .from("handover_photos")
    .createSignedUploadUrl(path, 60 * 5); // 5 min
  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  return new Response(JSON.stringify({ signedUrl: data.signedUrl, path }), {
    headers: { "Content-Type": "application/json" },
  });
});
