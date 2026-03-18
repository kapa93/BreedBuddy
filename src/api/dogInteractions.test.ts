jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { createDogInteraction } from '@/api/dogInteractions';
import { supabase } from '@/lib/supabase';
import type { DogInteraction } from '@/types';

function createExistingInteractionChain({
  data,
  error = null,
}: {
  data: DogInteraction | null;
  error?: Error | null;
}) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
  };
}

function createInsertChain({
  data,
  error = null,
}: {
  data: DogInteraction | null;
  error?: Error | null;
}) {
  return {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  };
}

describe('createDogInteraction', () => {
  const fromMock = supabase.from as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects self interactions before querying Supabase', async () => {
    await expect(
      createDogInteraction({
        dogId: 'dog-1',
        metDogId: 'dog-1',
        createdByUserId: 'user-1',
      })
    ).rejects.toThrow('A dog cannot meet itself.');

    expect(fromMock).not.toHaveBeenCalled();
  });

  it('returns an existing recent interaction instead of inserting a rapid duplicate', async () => {
    const existingInteraction: DogInteraction = {
      id: 'interaction-existing',
      dog_id_1: 'dog-a',
      dog_id_2: 'dog-b',
      created_by_user_id: 'user-1',
      location_name: 'Ocean Beach Dog Beach',
      source_type: 'dog_beach',
      created_at: '2026-03-18T10:00:00.000Z',
    };

    const existingChain = createExistingInteractionChain({ data: existingInteraction });
    fromMock.mockReturnValueOnce(existingChain);

    await expect(
      createDogInteraction({
        dogId: 'dog-b',
        metDogId: 'dog-a',
        createdByUserId: 'user-1',
        sourceType: 'dog_beach',
      })
    ).resolves.toEqual({
      interaction: existingInteraction,
      wasDuplicate: true,
    });

    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it('inserts a new canonical interaction when no recent duplicate exists', async () => {
    const existingChain = createExistingInteractionChain({ data: null });
    const insertChain = createInsertChain({
      data: {
        id: 'interaction-new',
        dog_id_1: 'dog-a',
        dog_id_2: 'dog-b',
        created_by_user_id: 'user-1',
        location_name: 'Ocean Beach Dog Beach',
        source_type: 'dog_beach',
        created_at: '2026-03-18T11:00:00.000Z',
      },
    });

    fromMock
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(insertChain);

    await expect(
      createDogInteraction({
        dogId: 'dog-b',
        metDogId: 'dog-a',
        createdByUserId: 'user-1',
        locationName: 'Ocean Beach Dog Beach',
        sourceType: 'dog_beach',
      })
    ).resolves.toEqual({
      interaction: expect.objectContaining({
        id: 'interaction-new',
        dog_id_1: 'dog-a',
        dog_id_2: 'dog-b',
      }),
      wasDuplicate: false,
    });

    expect(insertChain.insert).toHaveBeenCalledWith({
      dog_id_1: 'dog-a',
      dog_id_2: 'dog-b',
      created_by_user_id: 'user-1',
      location_name: 'Ocean Beach Dog Beach',
      source_type: 'dog_beach',
    });
  });
});
