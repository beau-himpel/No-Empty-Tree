import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface NominationSettings {
  id: number;
  nominations_enabled: boolean;
  active_season: number;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class NominationSettingsService {
  private readonly supabaseService = inject(SupabaseService);
  
  private readonly _nominationsEnabled = signal<boolean | null>(null);
  /** The Christmas season (year) whose families are shown and new nominations join. */
  private readonly _activeSeason = signal<number>(new Date().getFullYear());
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly nominationsEnabled = this._nominationsEnabled.asReadonly();
  readonly activeSeason = this._activeSeason.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  private loaded: Promise<void>;

  constructor() {
    this.loaded = this.loadNominationSettings();
  }

  /** The active season once settings have loaded (the current year if they couldn't be). */
  async currentSeason(): Promise<number> {
    await this.loaded;
    return this._activeSeason();
  }

  /**
   * Loads the nomination settings from Supabase
   */
  async loadNominationSettings(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const { data, error } = await this.supabaseService.client
        .from('nomination_settings')
        .select('nominations_enabled, active_season')
        .eq('id', 1)
        .single();

      if (error) {
        throw error;
      }

      this._nominationsEnabled.set(data?.nominations_enabled ?? false);
      if (data?.active_season) this._activeSeason.set(data.active_season);
    } catch (error: any) {
      console.error('Error loading nomination settings:', error);
      this._error.set(error.message || 'Failed to load nomination settings');
      this._nominationsEnabled.set(false); // Default to false on error
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Refreshes the nomination settings
   */
  async refresh(): Promise<void> {
    this.loaded = this.loadNominationSettings();
    await this.loaded;
  }
}
