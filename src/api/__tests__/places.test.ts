jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

import { supabase } from '@/lib/supabase';
import { getActivePlaceCheckinCounts } from '../places';

const mockFrom = supabase.from as jest.Mock;

function buildCountChain(rows: Array<{ place_id: string | null }> | null, error: Error | null = null) {
  return {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    gt: jest.fn().mockResolvedValue({ data: rows, error }),
  };
}

describe('getActivePlaceCheckinCounts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an empty object when placeIds is empty (no DB call)', async () => {
    const result = await getActivePlaceCheckinCounts([]);
    expect(result).toEqual({});
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns an empty object when no active check-ins exist for the given places', async () => {
    mockFrom.mockReturnValue(buildCountChain([]));
    const result = await getActivePlaceCheckinCounts(['place-1', 'place-2']);
    expect(result).toEqual({});
  });

  it('counts active check-in rows per place correctly', async () => {
    const rows = [
      { place_id: 'place-1' },
      { place_id: 'place-1' },
      { place_id: 'place-2' },
    ];
    mockFrom.mockReturnValue(buildCountChain(rows));
    const result = await getActivePlaceCheckinCounts(['place-1', 'place-2']);
    expect(result).toEqual({ 'place-1': 2, 'place-2': 1 });
  });

  it('skips rows with a null place_id', async () => {
    const rows = [
      { place_id: 'place-1' },
      { place_id: null },
    ];
    mockFrom.mockReturnValue(buildCountChain(rows));
    const result = await getActivePlaceCheckinCounts(['place-1']);
    expect(result).toEqual({ 'place-1': 1 });
  });

  it('throws when the query errors', async () => {
    mockFrom.mockReturnValue(buildCountChain(null, new Error('db error')));
    await expect(getActivePlaceCheckinCounts(['place-1'])).rejects.toThrow('db error');
  });
});
