jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

import { supabase } from '@/lib/supabase';
import { createPost, deletePost, getPlaceMeetupPosts, getPlacePosts, updatePost } from '../posts';

const mockFrom = supabase.from as jest.Mock;

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildChain(finalResult: object) {
  return {
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(finalResult),
  };
}

const BASE_POST = {
  breed: 'GOLDEN_RETRIEVER' as const,
  type: 'QUESTION' as const,
  tag: 'TRAINING' as const,
  content_text: 'Any tips?',
};

// ─── createPost ──────────────────────────────────────────────────────────────

describe('createPost', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws when the post insert errors', async () => {
    const chain = buildChain({ data: null, error: new Error('insert failed') });
    mockFrom.mockReturnValue(chain);

    await expect(createPost('u1', BASE_POST)).rejects.toThrow('insert failed');
  });

  it('returns the new post when no images and not a meetup', async () => {
    const newPost = { id: 'p1', author_id: 'u1', ...BASE_POST };
    const chain = buildChain({ data: newPost, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await createPost('u1', BASE_POST);
    expect(result).toEqual(newPost);
  });

  it('includes place_id in the posts insert when provided', async () => {
    const newPost = { id: 'p1', author_id: 'u1', ...BASE_POST, place_id: 'place-1' };
    const chain = buildChain({ data: newPost, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await createPost('u1', { ...BASE_POST, place_id: 'place-1' });
    expect(result).toEqual(newPost);
    // The insert should have been called (chain.insert is called on the posts table)
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ place_id: 'place-1' }),
    );
  });

  it('works correctly without place_id (backwards compatibility)', async () => {
    const newPost = { id: 'p1', author_id: 'u1', ...BASE_POST, place_id: null };
    const chain = buildChain({ data: newPost, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await createPost('u1', BASE_POST);
    expect(result).toEqual(newPost);
  });

  it('throws when post_images insert errors', async () => {
    const newPost = { id: 'p1', author_id: 'u1', ...BASE_POST };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'posts') return buildChain({ data: newPost, error: null });
      return {
        insert: jest.fn().mockResolvedValue({ data: null, error: new Error('image insert failed') }),
      };
    });

    await expect(createPost('u1', BASE_POST, ['https://example.com/img.jpg'])).rejects.toThrow('image insert failed');
  });

  it('throws when meetup_details insert errors', async () => {
    const newPost = { id: 'p1', author_id: 'u1', type: 'MEETUP', tag: 'TRAINING', breed: 'GOLDEN_RETRIEVER', content_text: 'Meetup!' };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'posts') return buildChain({ data: newPost, error: null });
      if (table === 'meetup_details') return {
        insert: jest.fn().mockResolvedValue({ data: null, error: new Error('meetup insert failed') }),
      };
      return buildChain({ data: null, error: null });
    });

    const meetupPost = {
      ...BASE_POST,
      type: 'MEETUP' as const,
      meetup_details: { location_name: 'Park', start_time: '2026-04-20T08:00:00Z' },
    };

    await expect(createPost('u1', meetupPost)).rejects.toThrow('meetup insert failed');
  });
});

// ─── deletePost ───────────────────────────────────────────────────────────────

describe('deletePost', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not throw on successful delete', async () => {
    let callCount = 0;
    const chain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount >= 2) return Promise.resolve({ error: null });
        return chain;
      }),
    };
    mockFrom.mockReturnValue(chain);
    await expect(deletePost('p1', 'u1')).resolves.not.toThrow();
  });
});

// ─── updatePost ───────────────────────────────────────────────────────────────

describe('updatePost', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws when the update errors', async () => {
    const chain = buildChain({ data: null, error: new Error('update failed') });
    mockFrom.mockReturnValue(chain);

    await expect(updatePost('p1', 'u1', { content_text: 'new content' })).rejects.toThrow('update failed');
  });

  it('returns the updated post on success', async () => {
    const updated = { id: 'p1', author_id: 'u1', content_text: 'new content' };
    const chain = buildChain({ data: updated, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await updatePost('p1', 'u1', { content_text: 'new content' });
    expect(result).toEqual(updated);
  });
});

// ─── getPlaceMeetupPosts ──────────────────────────────────────────────────────

describe('getPlaceMeetupPosts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an empty array when no meetups are linked to the place', async () => {
    const mdChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(mdChain);

    const result = await getPlaceMeetupPosts('place-1');
    expect(result).toEqual([]);
    expect(mockFrom).toHaveBeenCalledWith('meetup_details');
  });

  it('throws when the meetup_details query errors', async () => {
    const mdChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error('db error') }),
    };
    mockFrom.mockReturnValue(mdChain);

    await expect(getPlaceMeetupPosts('place-1')).rejects.toThrow('db error');
  });
});

// ─── getPlacePosts ─────────────────────────────────────────────────────────────

describe('getPlacePosts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an empty array when no posts are linked to the place', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getPlacePosts('place-1');
    expect(result).toEqual([]);
    expect(mockFrom).toHaveBeenCalledWith('posts');
    expect(chain.eq).toHaveBeenCalledWith('place_id', 'place-1');
  });

  it('throws when the posts query errors', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error('fetch error') }),
    };
    mockFrom.mockReturnValue(chain);

    await expect(getPlacePosts('place-1')).rejects.toThrow('fetch error');
  });
});
