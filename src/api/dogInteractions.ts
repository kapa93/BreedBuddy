import { supabase } from '@/lib/supabase';
import type { Dog, DogInteraction, DogInteractionSourceType, DogMetSummary } from '@/types';

const RAPID_DUPLICATE_WINDOW_MS = 5 * 60_000;

function toCanonicalPair(dogIdA: string, dogIdB: string) {
  return dogIdA < dogIdB
    ? { dog_id_1: dogIdA, dog_id_2: dogIdB }
    : { dog_id_1: dogIdB, dog_id_2: dogIdA };
}

export async function createDogInteraction({
  dogId,
  metDogId,
  createdByUserId,
  locationName = null,
  sourceType = 'manual',
}: {
  dogId: string;
  metDogId: string;
  createdByUserId: string;
  locationName?: string | null;
  sourceType?: DogInteractionSourceType;
}): Promise<{ interaction: DogInteraction; wasDuplicate: boolean }> {
  if (dogId === metDogId) {
    throw new Error('A dog cannot meet itself.');
  }

  const pair = toCanonicalPair(dogId, metDogId);
  const duplicateCutoff = new Date(Date.now() - RAPID_DUPLICATE_WINDOW_MS).toISOString();

  const { data: existingRecent, error: existingError } = await supabase
    .from('dog_interactions')
    .select('*')
    .eq('dog_id_1', pair.dog_id_1)
    .eq('dog_id_2', pair.dog_id_2)
    .gte('created_at', duplicateCutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingRecent) {
    return {
      interaction: existingRecent as DogInteraction,
      wasDuplicate: true,
    };
  }

  const { data, error } = await supabase
    .from('dog_interactions')
    .insert({
      ...pair,
      created_by_user_id: createdByUserId,
      location_name: locationName,
      source_type: sourceType,
    })
    .select('*')
    .single();

  if (error) throw error;

  return {
    interaction: data as DogInteraction,
    wasDuplicate: false,
  };
}

export async function getDogsMetByDog(dogId: string): Promise<DogMetSummary[]> {
  const { data, error } = await supabase
    .from('dog_interactions')
    .select('*')
    .or(`dog_id_1.eq.${dogId},dog_id_2.eq.${dogId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const interactions = (data ?? []) as DogInteraction[];
  if (interactions.length === 0) return [];

  const summaryByOtherDogId = new Map<
    string,
    {
      latest_interaction_at: string;
      interaction_count: number;
    }
  >();

  for (const interaction of interactions) {
    const otherDogId = interaction.dog_id_1 === dogId ? interaction.dog_id_2 : interaction.dog_id_1;
    const existing = summaryByOtherDogId.get(otherDogId);

    if (!existing) {
      summaryByOtherDogId.set(otherDogId, {
        latest_interaction_at: interaction.created_at,
        interaction_count: 1,
      });
      continue;
    }

    summaryByOtherDogId.set(otherDogId, {
      latest_interaction_at:
        interaction.created_at > existing.latest_interaction_at
          ? interaction.created_at
          : existing.latest_interaction_at,
      interaction_count: existing.interaction_count + 1,
    });
  }

  const otherDogIds = Array.from(summaryByOtherDogId.keys());
  const { data: dogsData, error: dogsError } = await supabase
    .from('dogs')
    .select('*')
    .in('id', otherDogIds);

  if (dogsError) throw dogsError;

  const dogsById = new Map((dogsData ?? []).map((dog) => [dog.id, dog as Dog]));

  return otherDogIds
    .map((otherDogId) => {
      const dog = dogsById.get(otherDogId);
      const summary = summaryByOtherDogId.get(otherDogId);
      if (!dog || !summary) return null;

      return {
        ...dog,
        latest_interaction_at: summary.latest_interaction_at,
        interaction_count: summary.interaction_count,
      } satisfies DogMetSummary;
    })
    .filter((dog): dog is DogMetSummary => dog !== null)
    .sort((a, b) => b.latest_interaction_at.localeCompare(a.latest_interaction_at));
}
