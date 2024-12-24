import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useDeviceList = (userId: string) => {
  return useQuery({
    queryKey: ['devices', userId], // Use userId for the query key
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', userId); // Filter devices by user_id

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
  });
};

export const useDevice = (id: number) => {
    return useQuery({
        queryKey: ['devices', id],
        queryFn: async () => {
          const { data, error } = await supabase
          .from('devices')
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

export const useUpdateDeviceId = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const { data, error } = await supabase
        .from('devices')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: async (_, { id }) => {
      await queryClient.invalidateQueries(['devices']);
      await queryClient.invalidateQueries(['devices', id]);
    },
  });
};

export const useDeleteDeviceId = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, user_id }: { id: number, user_id: string }) => {
      const { data, error } = await supabase
        .from('devices')
        .update({ user_id })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: async (_, { id }) => {
      await queryClient.invalidateQueries(['devices']);
      await queryClient.invalidateQueries(['devices', id]);
    },
  });
};


