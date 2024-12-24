import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCubeSidesList = (cube_id: number) => {
    return useQuery({
        queryKey: ['cubeSides', cube_id],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('cubeSides')
            .select('*')
            .eq('cube_id', cube_id); // Use cube_id instead of id

          if (error) {
            throw new Error(error.message);
          }
          return data;
        },
    });
};
export const useCubeSides = (id: number) => {
  return useQuery({
      queryKey: ['cubeSides', id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('cubeSides')
          .select('*')
          .eq('id', id) // Use cube_id instead of id
          .single();
        if (error) {
          throw new Error(error.message);
        }
        return data;
      },
  });
};
export const useUpdateCubeSideOne = () => {
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn(data: { id: number; action_type: string; toggle: { status: string; device_id: number } }) {
      const { error, data: updatedCubeSide } = await supabase
        .from('cubeSides')
        .update({
          action_type: data.action_type,
          toggle: data.toggle,
        })
        .eq('id', data.id)
        .select()
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return updatedCubeSide;
    },
    async onSuccess(_, { id }) {
      await queryClient.invalidateQueries({ queryKey: ['cubeSides'] });
      await queryClient.invalidateQueries({ queryKey: ['cubeSides', id] });
    },
  });
};
export const useUpdateCubeSideMultiple = () => {
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn(data: { sideId: number; actionValues: Array<{ [key: string]: string } | null>; selectedDeviceId: number }) {
      const { sideId, actionValues, selectedDeviceId } = data;

      const updateData = {
        action_type: 'multiple',
        shake: actionValues[0] ? { ...actionValues[0], device_id: selectedDeviceId } : null,
        clockwise: actionValues[1] ? { ...actionValues[1], device_id: selectedDeviceId } : null,
        r_clockwise: actionValues[2] ? { ...actionValues[2], device_id: selectedDeviceId } : null,
      };

      const { error } = await supabase
        .from('cubeSides')
        .update(updateData)
        .eq('id', sideId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['cubeSides'] });
    },
  });
};
