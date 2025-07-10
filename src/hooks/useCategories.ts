import { useAuthQuery } from "./useAuthQuery";
import { supabase } from "@/integrations/supabase/client";

export const useCategories = () => {
  return useAuthQuery(
    ["categories"],
    async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes for categories
    },
  );
};
