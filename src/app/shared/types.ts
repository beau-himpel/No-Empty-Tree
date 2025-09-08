export interface Family {
  id: string;
  name: string;
  members: FamilyMember[];
}

export interface FamilyMember {
  name: string;
  age: number;
  gender: string;
  isChild: boolean;
  wishList: WishItem[];
}

export interface WishItem {
  id: string;
  category: string;
  description: string;
  color?: string;
  size?: string;
  isAdopted: boolean;
  adoptedBy?: string;
  link?: string;
  details?: string;
} 