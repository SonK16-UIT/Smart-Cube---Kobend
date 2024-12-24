import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCube = (id: number) => {
    return useQuery({
        queryKey: ['cubes', id],
        queryFn: async () => {
          const { data, error } = await supabase
          .from('cubes')
          .select('*')
          .eq('id',id)
          .single();

          if (error) {
            throw new Error(error.message);
          }
          return data;
        },
      });
}