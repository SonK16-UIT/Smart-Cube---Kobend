import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useRoomList = () => {
    return useQuery({
        queryKey: ['rooms'],
        queryFn: async () => {
          const { data, error } = await supabase.from('rooms').select('*');
          if (error) {
            throw new Error(error.message);
          }
          return data;
        },
      });
}
export const useRoom = (id: number) => {
    return useQuery({
        queryKey: ['rooms', id],
        queryFn: async () => {
          const { data, error } = await supabase
          .from('rooms')
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
export const useInsertRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn(data: { room_name: string; user_id?: number | null; image?: string | null }) {
      const { error, data: newRoom } = await supabase
        .from('rooms')
        .insert({
          room_name: data.room_name,
          user_id: data.user_id || null,
          image: data.image || null,
        })
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return newRoom;
    },
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['rooms'] }); // Use object with `queryKey` property
    },
  });
};

export const useUpdateRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn(data:  any ) {
      const { error, data: updatedRoom } = await supabase
        .from('rooms')
        .update({
          room_name: data.room_name,
          user_id: data.user_id || null,
          image: data.image || null,
        })
        .eq('id',data.id)
        .select()
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return updatedRoom;
    }, 
    async onSuccess(_, { id }) {
      await queryClient.invalidateQueries({ queryKey: ['rooms'] }); // Use object with `queryKey` property
      await queryClient.invalidateQueries({ queryKey: ['rooms', id] });
    },
  });
}
export const useDeleteRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn(id: number) {
      const { error } = await supabase.from('rooms').delete().eq('id', id);
      if (error) {
        throw new Error(error.message);
      }
    },
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};