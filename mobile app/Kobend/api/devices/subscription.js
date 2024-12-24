import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react";

export const useUpdateDeviceSubscription = () => {
    const queryClient = useQueryClient();
    
    useEffect(() => {
      const devicesSubscription = supabase.channel('custom-update-channel')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'devices' },
          (payload) => {
            console.log('Change received!', payload);
            // Invalidate the query to trigger a refetch of devices
            queryClient.invalidateQueries(['devices']);
          }
        )
        .subscribe();
        
      return () => {
        devicesSubscription.unsubscribe();
      };
    }, [queryClient]);
  };
  