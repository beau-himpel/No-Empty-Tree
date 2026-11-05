export interface Family {
  id: string;
  last_name: string;
  // address/phone/email are stored but never readable through the API
  nominated_by?: string; // User ID of the user who nominated this family
  season: number; // Christmas season (year) the family was nominated for
  created_at: string;
  updated_at: string;
  family_members: FamilyMember[];
}

export interface FamilyMember {
  id: string;
  family_id: string;
  first_name: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  is_parent: boolean;
  ethnicity?: string | null;
  created_at: string;
  updated_at: string;
  wishlist_items?: WishItem[];
}

export interface WishItem {
  id: string;
  family_member_id: string;
  category: string;
  description: string;
  color?: string;
  size?: string;
  is_adopted: boolean;
  adopted_by?: string;
  adopted_by_name?: {
    full_name: string;
  };
  link?: string;
  details?: string;
  created_at: string;
  updated_at: string;
} 