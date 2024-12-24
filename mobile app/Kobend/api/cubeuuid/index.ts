import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export const useDeviceUUID = (name: string) => {
  return useQuery({
    queryKey: ['devicesUuid', name], // Use 'name' instead of 'id'
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devicesUuid') // Ensure this matches your table name
        .select('*')
        .eq('device_name', name)
        .single(); // Ensure you are expecting only one row

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  });
};
