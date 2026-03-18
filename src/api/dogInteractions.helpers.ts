import type { Dog, DogInteraction, DogMetSummary } from '@/types';

export const RAPID_DUPLICATE_WINDOW_MS = 5 * 60_000;

export function toCanonicalDogPair(dogIdA: string, dogIdB: string) {
  return dogIdA < dogIdB
    ? { dog_id_1: dogIdA, dog_id_2: dogIdB }
    : { dog_id_1: dogIdB, dog_id_2: dogIdA };
}

export function buildDogsMetSummaries({
  dogId,
  interactions,
  dogs,
}: {
  dogId: string;
  interactions: DogInteraction[];
  dogs: Dog[];
}): DogMetSummary[] {
  const summaryByOtherDogId = new Map<
    string,
    {
      latest_interaction_at: string;
      interaction_count: number;
    }
  >();

  for (const interaction of interactions) {
    if (interaction.dog_id_1 !== dogId && interaction.dog_id_2 !== dogId) {
      continue;
    }

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

  const dogsById = new Map(dogs.map((dog) => [dog.id, dog]));

  return Array.from(summaryByOtherDogId.entries())
    .map(([otherDogId, summary]) => {
      const dog = dogsById.get(otherDogId);
      if (!dog) return null;

      return {
        ...dog,
        latest_interaction_at: summary.latest_interaction_at,
        interaction_count: summary.interaction_count,
      } satisfies DogMetSummary;
    })
    .filter((dog): dog is DogMetSummary => dog !== null)
    .sort((a, b) => b.latest_interaction_at.localeCompare(a.latest_interaction_at));
}
