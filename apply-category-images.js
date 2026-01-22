// This script applies category images to the database
// Run with: node apply-category-images.js

const fs = require('fs');
const path = require('path');

// Database connection would go here - for now we'll generate SQL
const generateSQL = () => {
  const categoryUpdates = [
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

  let sql = '-- Update parent_collections with appropriate images\n';
  sql += '-- Generated on ' + new Date().toISOString() + '\n\n';

  categoryUpdates.forEach(category => {
    sql += `-- ${category.name}\n`;
    sql += `UPDATE parent_collections SET \n`;
    sql += `    image_desktop = '${category.image_desktop}',\n`;
    sql += `    image_mobile = '${category.image_mobile}',\n`;
    sql += `    updated_at = CURRENT_TIMESTAMP\n`;
    sql += `WHERE slug = '${category.slug}';\n\n`;
  });

  return sql;
};

const generateAPICommands = () => {
  const categoryUpdates = [
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

  let commands = '# API Commands to Update Categories\n';
  commands += '# Use these curl commands or the admin interface\n\n';

  categoryUpdates.forEach(category => {
    commands += `# Update ${category.name}\n`;
    commands += `curl -X PUT http://localhost:3000/api/collections/[ID] \\\n`;
    commands += `  -H "Content-Type: application/json" \\\n`;
    commands += `  -H "Authorization: Bearer YOUR_TOKEN" \\\n`;
    commands += `  -d '{\n`;
    commands += `    "image_desktop": "${category.image_desktop}",\n`;
    commands += `    "image_mobile": "${category.image_mobile}"\n`;
    commands += `  }'\n\n`;
  });

  return commands;
};

// Main execution
console.log('='.repeat(60));
console.log('CATEGORY IMAGE UPDATE SCRIPT');
console.log('='.repeat(60));
console.log('');

// Generate SQL file
const sqlContent = generateSQL();
fs.writeFileSync(path.join(__dirname, 'update-category-images.sql'), sqlContent);
console.log('✓ Generated SQL file: update-category-images.sql');

// Generate API commands file
const apiContent = generateAPICommands();
fs.writeFileSync(path.join(__dirname, 'update-category-api-commands.txt'), apiContent);
console.log('✓ Generated API commands file: update-category-api-commands.txt');

console.log('');
console.log('NEXT STEPS:');
console.log('1. Run the SQL commands in your database OR');
console.log('2. Use the admin interface at /admin to update collections');
console.log('3. Use the API commands in update-category-api-commands.txt');
console.log('');
console.log('The CategoryGrid component will automatically display these images');
console.log('once they are updated in the database.');
console.log('');
console.log('Files created:');
console.log('- update-category-images.sql (SQL commands)');
console.log('- update-category-api-commands.txt (API curl commands)');
