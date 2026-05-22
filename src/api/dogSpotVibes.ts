import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type VibeOption = Database['public']['Tables']['dog_spot_vibe_options']['Row'];
export type VibeVote   = Pick<
  Database['public']['Tables']['dog_spot_vibes']['Row'],
  'vibe_option_id' | 'user_id'
>;
export type VibeVoteWithPlace = Pick<
  Database['public']['Tables']['dog_spot_vibes']['Row'],
  'google_place_id' | 'vibe_option_id' | 'user_id'
>;

export async function getDogSpotVibeOptions(): Promise<VibeOption[]> {
  const { data, error } = await supabase
    .from('dog_spot_vibe_options')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getDogSpotVibes(googlePlaceId: string): Promise<VibeVote[]> {
  const { data, error } = await supabase
    .from('dog_spot_vibes')
    .select('vibe_option_id, user_id')
    .eq('google_place_id', googlePlaceId);

  if (error) throw error;
  return data ?? [];
}

export async function getDogSpotVibesForPlaces(googlePlaceIds: string[]): Promise<VibeVoteWithPlace[]> {
  if (!googlePlaceIds.length) return [];
  const { data, error } = await supabase
    .from('dog_spot_vibes')
    .select('google_place_id, vibe_option_id, user_id')
    .in('google_place_id', googlePlaceIds);

  if (error) throw error;
  return (data ?? []) as VibeVoteWithPlace[];
}

export async function addDogSpotVibe(
  googlePlaceId: string,
  vibeOptionId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('dog_spot_vibes')
    .upsert(
      { google_place_id: googlePlaceId, vibe_option_id: vibeOptionId, user_id: userId },
      { onConflict: 'google_place_id,vibe_option_id,user_id' },
    );

  if (error) throw error;
}

export async function removeDogSpotVibe(
  googlePlaceId: string,
  vibeOptionId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('dog_spot_vibes')
    .delete()
    .eq('google_place_id', googlePlaceId)
    .eq('vibe_option_id', vibeOptionId)
    .eq('user_id', userId);

  if (error) throw error;
}
