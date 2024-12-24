import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useLed = (id: number) => {
    return useQuery({
        queryKey: ['leds', id],
        queryFn: async () => {
          const { data, error } = await supabase
          .from('leds')
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
export const useUpdateLedId = () => {
    const queryClient = useQueryClient();
  
    return useMutation({
      mutationFn: async ({ id, dim }: { id: number; dim: number }) => {
        const { data, error } = await supabase
          .from('leds')
          .update({ dim })
          .eq('id', id)
          .select()
          .single();
  
        if (error) {
          throw new Error(error.message);
        }
  
        return data;
      },
      onSuccess: async (_, { id }) => {
        await queryClient.invalidateQueries(['leds']);
        await queryClient.invalidateQueries(['leds', id]);
      },
    });
  };