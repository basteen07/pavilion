const fs = require('fs');
const path = require('path');

// Category to image mappings based on available files
const categoryImageMappings = [
  {
    name: 'Cricket',
    slug: 'cricket',
    image_desktop: '/uploads/1766324642324-295972127-Cricket.jpg',
    image_mobile: '/uploads/1766324642324-295972127-Cricket.jpg'
  },
  {
    name: 'Football',
    slug: 'football', 
    image_desktop: '/uploads/1766325274874-449197930-buy-Football-online.jpeg',
    image_mobile: '/uploads/1766325274874-449197930-buy-Football-online.jpeg'
  },
  {
    name: 'Basketball',
    slug: 'basketball',
    image_desktop: '/uploads/1766325343693-856817141-Bascketball.jpeg',
    image_mobile: '/uploads/1766325343693-856817141-Bascketball.jpeg'
  },
  {
    name: 'Volleyball',
    slug: 'volleyball',
    image_desktop: '/uploads/1766325379045-234688888-Volleyballl.jpeg',
    image_mobile: '/uploads/1766325379045-234688888-Volleyballl.jpeg'
  },
  {
    name: 'Team Sports',
    slug: 'team-sports',
    image_desktop: '/uploads/1766323229008-576900632-TeamSport.jpg',
    image_mobile: '/uploads/1766323229008-576900632-TeamSport.jpg'
  },
  {
    name: 'Individual Games',
    slug: 'individual-games',
    image_desktop: '/uploads/1766324180816-433552644-IndividualGames.jpg',
    image_mobile: '/uploads/1766324180816-433552644-IndividualGames.jpg'
  },
  {
    name: 'Fitness & Training',
    slug: 'fitness-training',
    image_desktop: '/uploads/1766324246576-975951444-FitnessTrainingEquipments.jpg',
    image_mobile: '/uploads/1766324246576-975951444-FitnessTrainingEquipments.jpg'
  },
  {
    name: 'Indoor Sports',
    slug: 'indoor-sports',
    image_desktop: '/uploads/1766324291541-584693456-IndoorSportsGoods.jpg',
    image_mobile: '/uploads/1766324291541-584693456-IndoorSportsGoods.jpg'
  },
  {
    name: 'Shoes & Clothing',
    slug: 'shoes-clothing',
    image_desktop: '/uploads/1766316587194-345817537-ShoesClothing.jpg',
    image_mobile: '/uploads/1766316587194-345817537-ShoesClothing.jpg'
  }
];

console.log('Category Image Update Script');
console.log('=============================\n');

console.log('This script will update the parent_collections table with appropriate images.');
console.log('The following mappings will be applied:\n');

categoryImageMappings.forEach((category, index) => {
  console.log(`${index + 1}. ${category.name}`);
  console.log(`   Desktop: ${category.image_desktop}`);
  console.log(`   Mobile: ${category.image_mobile}`);
  console.log('');
});

console.log('\nTo apply these updates, run the SQL commands below in your database:\n');

categoryImageMappings.forEach(category => {
  console.log(`-- Update ${category.name}`);
  console.log(`UPDATE parent_collections SET 
    image_desktop = '${category.image_desktop}',
    image_mobile = '${category.image_mobile}',
    updated_at = CURRENT_TIMESTAMP
  WHERE slug = '${category.slug}';`);
  console.log('');
});

console.log('Or use the API endpoints to update each category:');
console.log('PUT /api/collections/[id] with body:');
console.log(JSON.stringify({
  image_desktop: '/uploads/path/to/image.jpg',
  image_mobile: '/uploads/path/to/image.jpg'
}, null, 2));
