import { supabase } from '@/lib/supabase';
import type { Place } from '@/types';

export async function getSavedPlaces(userId: string): Promise<Place[]> {
  const { data, error } = await supabase
    .from('user_place_saves')
    .select('place_id, places(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as Array<{ places: Place }>).map((row) => row.places);
}

export async function savePlace(userId: string, placeId: string): Promise<void> {
  const { error } = await supabase
    .from('user_place_saves')
    .upsert({ user_id: userId, place_id: placeId }, { onConflict: 'user_id,place_id' });

  if (error) throw error;
}

export async function unsavePlace(userId: string, placeId: string): Promise<void> {
  const { error } = await supabase
    .from('user_place_saves')
    .delete()
    .eq('user_id', userId)
    .eq('place_id', placeId);

  if (error) throw error;
}

export async function isPlaceSaved(userId: string, placeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_place_saves')
    .select('place_id')
    .eq('user_id', userId)
    .eq('place_id', placeId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
