import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Fetch user data
export const useUser = (id: number) => {
  return useQuery({
    queryKey: ["profiles", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
  });
};

// Update user profile
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn(data: any) {
      const { error, data: updatedUser } = await supabase
        .from("profiles")
        .update({
          username: data.username,
          website: data.website || null,
          avatar_url: data.avatar_url || null,
        })
        .eq("id", data.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return updatedUser;
    },
    async onSuccess(_, { id }) {
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["profiles", id] });
    },
  });
};



// Update avatar URL
export const useUpdateAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // Dynamic mutation function
    mutationFn: async ({ id, avatarPath }: { id: number; avatarPath: string }) => {
      const { data: updatedUser, error } = await supabase
        .from("profiles")
        .update({
          avatar_url: avatarPath,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return updatedUser;
    },
    // Invalidate queries on success
    onSuccess: async (_, { id }) => {
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["profiles", id] });
    },
  });
};


// Upload avatar to Supabase storage
export const uploadAvatar = async (file: any) => {
  try {
    const filePath = `${Date.now()}.${file.uri.split(".").pop()}`;
    const response = await fetch(file.uri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(filePath, blob, { contentType: file.type });

    if (error) {
      throw new Error(error.message);
    }

    return { filePath: data.path };
  } catch (error) {
    console.error("Error uploading avatar:", error);
    throw error;
  }
};
