import { supabase } from '@/lib/supabase';
import type { BreedEnum } from '@/types';

export async function getJoinedBreeds(userId: string): Promise<BreedEnum[]> {
  const { data, error } = await supabase
    .from('user_breed_joins')
    .select('breed')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((r) => r.breed as BreedEnum);
}

export async function joinBreedFeed(userId: string, breed: BreedEnum): Promise<void> {
  const { error } = await supabase
    .from('user_breed_joins')
    .upsert({ user_id: userId, breed }, { onConflict: 'user_id,breed' });

  if (error) throw error;
}

export async function leaveBreedFeed(userId: string, breed: BreedEnum): Promise<void> {
  const { error } = await supabase
    .from('user_breed_joins')
    .delete()
    .eq('user_id', userId)
    .eq('breed', breed);

  if (error) throw error;
}

export async function isJoined(userId: string, breed: BreedEnum): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_breed_joins')
    .select('breed')
    .eq('user_id', userId)
    .eq('breed', breed)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
