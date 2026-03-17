import { useQuery } from '@tanstack/react-query';
import { getDogsMetByDog } from '@/api/dogInteractions';

export function useDogsMetByDog(dogId?: string | null) {
  return useQuery({
    queryKey: ['dogsMet', dogId],
    queryFn: () => getDogsMetByDog(dogId!),
    enabled: !!dogId,
  });
}
