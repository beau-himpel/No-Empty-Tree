import { Family } from '../shared/types';

export const mockFamilies: Family[] = [
  {
    id: '1',
    last_name: 'Johnson',
    address: '123 Oak Street, Springfield, IL 62701',
    phone: '555-0123',
    email: 'johnson.family@email.com',
    nominated_by: 'cf37c331-31fa-4282-a2a4-190eb04372ed',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    members: [
      {
        id: '1-1',
        family_id: '1',
        first_name: 'Sarah',
        age: 35,
        sex: 'female',
        is_parent: true,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
        wishlist_items: [
          { id: '1', family_member_id: '1-1', category: 'Clothing', description: 'Warm winter coat', color: 'Blue', size: 'M', is_adopted: true, adopted_by: 'Jennifer Smith', link: 'https://www.amazon.com/winter-coat-blue', details: 'Preferably Columbia or North Face brand. Needs to be waterproof for winter weather.', created_at: '2024-01-15T10:30:00Z', updated_at: '2024-01-15T10:30:00Z' },
          { id: '2', family_member_id: '1-1', category: 'Home', description: 'Kitchen utensils set', is_adopted: false, link: 'https://www.target.com/kitchen-utensils', details: 'Looking for a complete set with at least 15 pieces. Wooden handles preferred.', created_at: '2024-01-15T10:30:00Z', updated_at: '2024-01-15T10:30:00Z' }
        ]
      },
      {
        id: '1-2',
        family_id: '1',
        first_name: 'Mike',
        age: 38,
        sex: 'male',
        is_parent: true,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
        wishlist_items: [
          { id: '3', family_member_id: '1-2', category: 'Clothing', description: 'Work boots', color: 'Brown', size: '10', is_adopted: true, adopted_by: 'John Doe', link: 'https://www.workboots.com/brown-size-10', details: 'Preferably Columbia or North Face brand. Needs to be waterproof for winter weather.', created_at: '2024-01-15T10:30:00Z', updated_at: '2024-01-15T10:30:00Z' }
        ]
      },
      {
        id: '1-3',
        family_id: '1',
        first_name: 'Emma',
        age: 8,
        sex: 'female',
        is_parent: false,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
        wishlist_items: [
          { id: '4', family_member_id: '1-3', category: 'Toy', description: 'Art supplies set', is_adopted: true, adopted_by: 'David Wilson', link: 'https://www.michaels.com/art-supplies-set', details: 'Crayola brand preferred. Need crayons, markers, colored pencils, and sketchbook. Age 8+ appropriate.', created_at: '2024-01-15T10:30:00Z', updated_at: '2024-01-15T10:30:00Z' },
          { id: '5', family_member_id: '1-3', category: 'Clothing', description: 'Winter hat and gloves', color: 'Pink', size: 'S', is_adopted: false, link: 'https://www.walmart.com/winter-hat-gloves-pink', details: 'Matching set. Gloves should be touchscreen compatible.', created_at: '2024-01-15T10:30:00Z', updated_at: '2024-01-15T10:30:00Z' }
        ]
      },
      {
        id: '1-4',
        family_id: '1',
        first_name: 'Lucas',
        age: 5,
        sex: 'male',
        is_parent: false,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
        wishlist_items: [
          { id: '6', family_member_id: '1-4', category: 'Toy', description: 'Building blocks', is_adopted: true, adopted_by: 'John Doe', details: 'LEGO Duplo or Mega Bloks. Age 3-5 appropriate. At least 50 pieces.', created_at: '2024-01-15T10:30:00Z', updated_at: '2024-01-15T10:30:00Z' }
        ]
      },
      {
        id: '1-5',
        family_id: '1',
        first_name: 'Sophia',
        age: 2,
        sex: 'female',
        is_parent: false,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
        wishlist_items: [
          { id: '7', family_member_id: '1-5', category: 'Clothing', description: 'Warm pajamas', color: 'Purple', size: '2T', is_adopted: false, created_at: '2024-01-15T10:30:00Z', updated_at: '2024-01-15T10:30:00Z' }
        ]
      }
    ]
  },
  {
    id: '2',
    last_name: 'Martinez',
    address: '456 Pine Avenue, Springfield, IL 62702',
    phone: '555-0456',
    email: 'martinez.family@email.com',
    nominated_by: 'cf37c331-31fa-4282-a2a4-190eb04372ed',
    created_at: '2024-01-16T14:20:00Z',
    updated_at: '2024-01-16T14:20:00Z',
    members: [
      {
        id: '2-1',
        family_id: '2',
        first_name: 'Maria',
        age: 28,
        sex: 'female',
        is_parent: true,
        created_at: '2024-01-16T14:20:00Z',
        updated_at: '2024-01-16T14:20:00Z',
        wishlist_items: [
          { id: '8', family_member_id: '2-1', category: 'Clothing', description: 'Winter jacket', color: 'Black', size: 'S', is_adopted: false, created_at: '2024-01-16T14:20:00Z', updated_at: '2024-01-16T14:20:00Z' },
          { id: '9', family_member_id: '2-1', category: 'Home', description: 'Bedding set', is_adopted: true, adopted_by: 'Sarah Johnson', created_at: '2024-01-16T14:20:00Z', updated_at: '2024-01-16T14:20:00Z' }
        ]
      },
      {
        id: '2-2',
        family_id: '2',
        first_name: 'Diego',
        age: 10,
        sex: 'male',
        is_parent: false,
        created_at: '2024-01-16T14:20:00Z',
        updated_at: '2024-01-16T14:20:00Z',
        wishlist_items: [
          { id: '10', family_member_id: '2-2', category: 'Toy', description: 'Soccer ball', is_adopted: false, created_at: '2024-01-16T14:20:00Z', updated_at: '2024-01-16T14:20:00Z' },
          { id: '11', family_member_id: '2-2', category: 'Clothing', description: 'School uniform', color: 'Navy', size: 'M', is_adopted: false, created_at: '2024-01-16T14:20:00Z', updated_at: '2024-01-16T14:20:00Z' }
        ]
      },
      {
        id: '2-3',
        family_id: '2',
        first_name: 'Isabella',
        age: 6,
        sex: 'female',
        is_parent: false,
        created_at: '2024-01-16T14:20:00Z',
        updated_at: '2024-01-16T14:20:00Z',
        wishlist_items: [
          { id: '12', family_member_id: '2-3', category: 'Toy', description: 'Doll house', is_adopted: false, created_at: '2024-01-16T14:20:00Z', updated_at: '2024-01-16T14:20:00Z' }
        ]
      }
    ]
  }
]; 