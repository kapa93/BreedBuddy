import { buildDogsMetSummaries, toCanonicalDogPair } from '@/api/dogInteractions.helpers';
import type { Dog, DogInteraction } from '@/types';

function makeDog(overrides: Partial<Dog> = {}): Dog {
  return {
    id: overrides.id ?? 'dog-1',
    owner_id: overrides.owner_id ?? 'owner-1',
    name: overrides.name ?? 'Mochi',
    breed: overrides.breed ?? 'HUSKY',
    age_group: overrides.age_group ?? 'ADULT',
    energy_level: overrides.energy_level ?? 'HIGH',
    dog_friendliness: overrides.dog_friendliness ?? null,
    play_style: overrides.play_style ?? null,
    good_with_puppies: overrides.good_with_puppies ?? null,
    good_with_large_dogs: overrides.good_with_large_dogs ?? null,
    good_with_small_dogs: overrides.good_with_small_dogs ?? null,
    temperament_notes: overrides.temperament_notes ?? null,
    dog_image_url: overrides.dog_image_url ?? null,
    created_at: overrides.created_at ?? '2026-03-18T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-03-18T00:00:00.000Z',
  };
}

function makeInteraction(overrides: Partial<DogInteraction> = {}): DogInteraction {
  return {
    id: overrides.id ?? 'interaction-1',
    dog_id_1: overrides.dog_id_1 ?? 'dog-1',
    dog_id_2: overrides.dog_id_2 ?? 'dog-2',
    created_by_user_id: overrides.created_by_user_id ?? 'owner-1',
    location_name: overrides.location_name ?? null,
    source_type: overrides.source_type ?? 'manual',
    created_at: overrides.created_at ?? '2026-03-18T00:00:00.000Z',
  };
}

describe('dogInteractions.helpers', () => {
  it('creates a canonical dog pair regardless of input order', () => {
    expect(toCanonicalDogPair('dog-b', 'dog-a')).toEqual({
      dog_id_1: 'dog-a',
      dog_id_2: 'dog-b',
    });
  });

  it('builds unique met-dog summaries with counts and latest interaction time', () => {
    const dogId = 'dog-self';
    const friendAlpha = makeDog({ id: 'dog-alpha', name: 'Alpha' });
    const friendBeta = makeDog({ id: 'dog-beta', name: 'Beta' });

    const interactions = [
      makeInteraction({
        id: 'i-1',
        dog_id_1: 'dog-alpha',
        dog_id_2: dogId,
        created_at: '2026-03-17T09:00:00.000Z',
      }),
      makeInteraction({
        id: 'i-2',
        dog_id_1: dogId,
        dog_id_2: 'dog-beta',
        created_at: '2026-03-18T10:00:00.000Z',
      }),
      makeInteraction({
        id: 'i-3',
        dog_id_1: dogId,
        dog_id_2: 'dog-alpha',
        created_at: '2026-03-18T11:00:00.000Z',
      }),
      makeInteraction({
        id: 'i-4',
        dog_id_1: 'dog-other-a',
        dog_id_2: 'dog-other-b',
        created_at: '2026-03-18T12:00:00.000Z',
      }),
    ];

    expect(
      buildDogsMetSummaries({
        dogId,
        interactions,
        dogs: [friendAlpha, friendBeta],
      })
    ).toEqual([
      expect.objectContaining({
        id: 'dog-alpha',
        name: 'Alpha',
        interaction_count: 2,
        latest_interaction_at: '2026-03-18T11:00:00.000Z',
      }),
      expect.objectContaining({
        id: 'dog-beta',
        name: 'Beta',
        interaction_count: 1,
        latest_interaction_at: '2026-03-18T10:00:00.000Z',
      }),
    ]);
  });
});
