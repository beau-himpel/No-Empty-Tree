import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey,
      {
        auth: {
          // Enable session persistence
          persistSession: true,
          autoRefreshToken: true,
          // Use a consistent storage key but handle lock errors gracefully
          storageKey: 'sb-auth-token',
          // Handle storage errors gracefully, including NavigatorLockAcquireTimeoutError
          storage: {
            getItem: (key: string) => {
              try {
                return localStorage.getItem(key);
              } catch (error: any) {
                if (error?.name === 'NavigatorLockAcquireTimeoutError') {
                  console.warn('NavigatorLockAcquireTimeoutError - falling back to sessionStorage');
                  try {
                    return sessionStorage.getItem(key);
                  } catch (sessionError) {
                    console.warn('SessionStorage also failed:', sessionError);
                    return null;
                  }
                }
                console.warn('Failed to get item from localStorage:', error);
                return null;
              }
            },
            setItem: (key: string, value: string) => {
              try {
                localStorage.setItem(key, value);
              } catch (error: any) {
                if (error?.name === 'NavigatorLockAcquireTimeoutError') {
                  console.warn('NavigatorLockAcquireTimeoutError - falling back to sessionStorage');
                  try {
                    sessionStorage.setItem(key, value);
                  } catch (sessionError) {
                    console.warn('SessionStorage also failed:', sessionError);
                  }
                } else {
                  console.warn('Failed to set item in localStorage:', error);
                }
              }
            },
            removeItem: (key: string) => {
              try {
                localStorage.removeItem(key);
              } catch (error: any) {
                if (error?.name === 'NavigatorLockAcquireTimeoutError') {
                  console.warn('NavigatorLockAcquireTimeoutError - removing from sessionStorage');
                  try {
                    sessionStorage.removeItem(key);
                  } catch (sessionError) {
                    console.warn('SessionStorage removal also failed:', sessionError);
                  }
                } else {
                  console.warn('Failed to remove item from localStorage:', error);
                }
              }
            }
          }
        }
      }
    );

    // Handle auth state changes with error handling
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.handleAuthStateChange(event, session);
    });
  }


  private handleAuthStateChange(event: string, session: any) {
    try {
      // Handle auth state changes
      console.log('Auth state change:', event, session);
    } catch (error) {
      console.warn('Error handling auth state change:', error);
    }
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  // Family-related methods
  async getFamiliesWithMembers() {
    const { data, error } = await this.supabase
      .from('families')
      .select(`
        id,
        last_name,
        address,
        phone,
        email,
        nominated_by,
        created_at,
        updated_at,
        family_members (
          id,
          family_id,
          first_name,
          age,
          sex,
          is_parent,
          created_at,
          updated_at,
          wishlist_items (
            id,
            family_member_id,
            category,
            description,
            color,
            size,
            is_adopted,
            adopted_by,
            adopted_by_name:profiles!wishlist_items_adopted_by_fkey(full_name),
            link,
            details,
            created_at,
            updated_at
          )
        )
      `)
      .order('last_name');

    if (error) throw error;
    
    if (data) {
      data.forEach(family => {
        if (family.family_members) {
          family.family_members.sort((a, b) => b.age - a.age);
        }
      });
    }
    
    return data;
  }

  async getFamilyById(familyId: string) {
    const { data, error } = await this.supabase
      .from('families')
      .select(`
        id,
        last_name,
        address,
        phone,
        email,
        nominated_by,
        created_at,
        updated_at,
        family_members (
          id,
          family_id,
          first_name,
          age,
          sex,
          is_parent,
          created_at,
          updated_at,
          wishlist_items (
            id,
            family_member_id,
            category,
            description,
            color,
            size,
            is_adopted,
            adopted_by,
            adopted_by_name:profiles!wishlist_items_adopted_by_fkey(full_name),
            link,
            details,
            created_at,
            updated_at
          )
        )
      `)
      .eq('id', familyId)
      .single();

    if (error) throw error;
    
    if (data && data.family_members) {
      data.family_members.sort((a, b) => b.age - a.age);
    }
    
    return data;
  }

  async createFamily(familyData: {
    last_name: string;
    address: string;
    phone?: string;
    email?: string;
    nominated_by?: string;
  }) {
    const { data, error } = await this.supabase
      .from('families')
      .insert(familyData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async addFamilyMember(memberData: {
    family_id: string;
    first_name: string;
    age: number;
    sex: 'male' | 'female' | 'other';
    is_parent: boolean;
  }) {
    const { data, error } = await this.supabase
      .from('family_members')
      .insert(memberData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateFamily(familyId: string, updates: {
    last_name?: string;
    address?: string;
    phone?: string;
    email?: string;
    nominated_by?: string;
  }) {
    const { data, error } = await this.supabase
      .from('families')
      .update(updates)
      .eq('id', familyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateFamilyMember(memberId: string, updates: {
    first_name?: string;
    age?: number;
    sex?: 'male' | 'female' | 'other';
    is_parent?: boolean;
  }) {
    const { data, error } = await this.supabase
      .from('family_members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteFamily(familyId: string) {
    const { error } = await this.supabase
      .from('families')
      .delete()
      .eq('id', familyId);

    if (error) throw error;
  }

  async deleteFamilyMember(memberId: string) {
    const { error } = await this.supabase
      .from('family_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;
  }

  async getFamiliesNominatedByUser(userId: string) {
    const { data, error } = await this.supabase
      .from('families')
      .select(`
        id,
        last_name,
        address,
        phone,
        email,
        nominated_by,
        created_at,
        updated_at,
        family_members (
          id,
          family_id,
          first_name,
          age,
          sex,
          is_parent,
          created_at,
          updated_at,
          wishlist_items (
            id,
            family_member_id,
            category,
            description,
            color,
            size,
            is_adopted,
            adopted_by,
            adopted_by_name:profiles!wishlist_items_adopted_by_fkey(full_name),
            link,
            details,
            created_at,
            updated_at
          )
        )
      `)
      .eq('nominated_by', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Wishlist item methods
  async addWishlistItem(itemData: {
    family_member_id: string;
    category: string;
    description: string;
    color?: string;
    size?: string;
    link?: string;
    details?: string;
  }) {
    const { data, error } = await this.supabase
      .from('wishlist_items')
      .insert(itemData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateWishlistItem(itemId: string, updates: {
    category?: string;
    description?: string;
    color?: string;
    size?: string;
    link?: string;
    details?: string;
  }) {
    const { data, error } = await this.supabase
      .from('wishlist_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteWishlistItem(itemId: string) {
    const { error } = await this.supabase
      .from('wishlist_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  }

  async adoptWishlistItem(itemId: string, adoptedBy: string) {
    const { data, error } = await this.supabase
      .from('wishlist_items')
      .update({ 
        is_adopted: true,
        adopted_by: adoptedBy
      })
      .eq('id', itemId)
      // Never take over an item someone else adopted after this page loaded
      .eq('is_adopted', false)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async unadoptWishlistItem(itemId: string) {
    const { data, error } = await this.supabase
      .from('wishlist_items')
      .update({ 
        is_adopted: false, 
        adopted_by: null 
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWishlistItemsByUser(userId: string) {
    const { data, error } = await this.supabase
      .from('wishlist_items')
      .select(`
        id,
        family_member_id,
        category,
        description,
        color,
        size,
        is_adopted,
        adopted_by,
        adopted_by_name:profiles!wishlist_items_adopted_by_fkey(full_name),
        link,
        details,
        created_at,
        updated_at,
        family_members!inner (
          id,
          first_name,
          families!inner (
            id,
            last_name
          )
        )
      `)
      .eq('adopted_by', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
} 