export const mockFamilies = [
  {
    id: '1',
    name: 'The Johnson Family',
    members: [
      {
        name: 'Sarah Johnson',
        age: 35,
        gender: 'Female',
        isChild: false,
        wishList: [
          { id: '1', category: 'Clothing', description: 'Warm winter coat', color: 'Blue', size: 'M', isAdopted: true, adoptedBy: 'Jennifer Smith', link: 'https://www.amazon.com/winter-coat-blue', details: 'Preferably Columbia or North Face brand. Needs to be waterproof for winter weather.' },
          { id: '2', category: 'Home', description: 'Kitchen utensils set', isAdopted: false, link: 'https://www.target.com/kitchen-utensils', details: 'Looking for a complete set with at least 15 pieces. Wooden handles preferred.' }
        ]
      },
      {
        name: 'Mike Johnson',
        age: 38,
        gender: 'Male',
        isChild: false,
        wishList: [
          { id: '3', category: 'Clothing', description: 'Work boots', color: 'Brown', size: '10', isAdopted: true, adoptedBy: 'John Doe', link: 'https://www.workboots.com/brown-size-10', details: 'Preferably Columbia or North Face brand. Needs to be waterproof for winter weather.' }
        ]
      },
      {
        name: 'Emma Johnson',
        age: 8,
        gender: 'Female',
        isChild: true,
        wishList: [
          { id: '4', category: 'Toy', description: 'Art supplies set', isAdopted: true, adoptedBy: 'David Wilson', link: 'https://www.michaels.com/art-supplies-set', details: 'Crayola brand preferred. Need crayons, markers, colored pencils, and sketchbook. Age 8+ appropriate.' },
          { id: '5', category: 'Clothing', description: 'Winter hat and gloves', color: 'Pink', size: 'S', isAdopted: false, link: 'https://www.walmart.com/winter-hat-gloves-pink', details: 'Matching set. Gloves should be touchscreen compatible.' }
        ]
      },
      {
        name: 'Lucas Johnson',
        age: 5,
        gender: 'Male',
        isChild: true,
        wishList: [
          { id: '6', category: 'Toy', description: 'Building blocks', isAdopted: true, adoptedBy: 'John Doe', details: 'LEGO Duplo or Mega Bloks. Age 3-5 appropriate. At least 50 pieces.' }
        ]
      },
      {
        name: 'Sophia Johnson',
        age: 2,
        gender: 'Female',
        isChild: true,
        wishList: [
          { id: '7', category: 'Clothing', description: 'Warm pajamas', color: 'Purple', size: '2T', isAdopted: false }
        ]
      }
    ]
  },
  {
    id: '2',
    name: 'The Martinez Family',
    members: [
      {
        name: 'Maria Martinez',
        age: 28,
        gender: 'Female',
        isChild: false,
        wishList: [
          { id: '8', category: 'Clothing', description: 'Winter jacket', color: 'Black', size: 'S', isAdopted: false },
          { id: '9', category: 'Home', description: 'Bedding set', isAdopted: true, adoptedBy: 'Sarah Johnson' }
        ]
      },
      {
        name: 'Diego Martinez',
        age: 10,
        gender: 'Male',
        isChild: true,
        wishList: [
          { id: '10', category: 'Toy', description: 'Soccer ball', isAdopted: false },
          { id: '11', category: 'Clothing', description: 'School uniform', color: 'Navy', size: 'M', isAdopted: false }
        ]
      },
      {
        name: 'Isabella Martinez',
        age: 6,
        gender: 'Female',
        isChild: true,
        wishList: [
          { id: '12', category: 'Toy', description: 'Doll house', isAdopted: false }
        ]
      }
    ]
  }
]; 