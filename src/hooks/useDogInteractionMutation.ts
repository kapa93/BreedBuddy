import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDogInteraction } from '@/api/dogInteractions';

export function useDogInteractionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDogInteraction,
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dogsMet'] });
      queryClient.invalidateQueries({ queryKey: ['dog', variables.dogId] });
      queryClient.invalidateQueries({ queryKey: ['dog', variables.metDogId] });
    },
  });
}
