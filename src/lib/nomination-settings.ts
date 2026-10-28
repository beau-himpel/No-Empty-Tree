import { createStore, useStore } from './store';
import { supabase } from './supabase';

export interface NominationSettingsState {
  /** null until loaded. */
  nominationsEnabled: boolean | null;
  /** The Christmas season (year) whose families are shown and new nominations join. */
  activeSeason: number;
  loading: boolean;
  error: string | null;
}

const nominationSettings = createStore<NominationSettingsState>({
  nominationsEnabled: null,
  activeSeason: new Date().getFullYear(),
  loading: false,
  error: null,
});

export function useNominationSettings(): NominationSettingsState {
  return useStore(nominationSettings);
}

function patch(changes: Partial<NominationSettingsState>): void {
  nominationSettings.set((state) => ({ ...state, ...changes }));
}

async function loadNominationSettings(): Promise<void> {
  patch({ loading: true, error: null });
  try {
    const { data, error } = await supabase
      .from('nomination_settings')
      .select('nominations_enabled, active_season')
      .eq('id', 1)
      .single();
    if (error) throw error;

    patch({
      nominationsEnabled: data?.nominations_enabled ?? false,
      ...(data?.active_season ? { activeSeason: data.active_season } : {}),
    });
  } catch (error) {
    console.error('Error loading nomination settings:', error);
    patch({
      error: (error as { message?: string })?.message || 'Failed to load nomination settings',
      // Default to closed on error
      nominationsEnabled: false,
    });
  } finally {
    patch({ loading: false });
  }
}

const loaded = loadNominationSettings();

/** The active season once settings have loaded (the current year if they couldn't be). */
export async function currentSeason(): Promise<number> {
  await loaded;
  return nominationSettings.get().activeSeason;
}
