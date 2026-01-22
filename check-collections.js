const { query } = require('./lib/simple-db.js');

async function checkCollections() {
  try {
    console.log('Checking current parent_collections data...\n');
    
    const result = await query(`
      SELECT id, name, slug, image_desktop, image_mobile, is_active 
      FROM parent_collections 
      ORDER BY created_at ASC
    `);
    
    if (result.rows.length === 0) {
      console.log('No collections found in the database.');
    } else {
      console.log(`Found ${result.rows.length} collections:\n`);
      
      result.rows.forEach((collection, index) => {
        console.log(`${index + 1}. ${collection.name}`);
        console.log(`   ID: ${collection.id}`);
        console.log(`   Slug: ${collection.slug}`);
        console.log(`   Desktop Image: ${collection.image_desktop || 'NOT SET'}`);
        console.log(`   Mobile Image: ${collection.image_mobile || 'NOT SET'}`);
        console.log(`   Active: ${collection.is_active}`);
        console.log('');
      });
    }
    
    // Check uploads directory for existing category images
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    
    if (fs.existsSync(uploadsDir)) {
      console.log('\nFiles in uploads directory:');
      const files = fs.readdirSync(uploadsDir);
      files.forEach(file => {
        console.log(`   - ${file}`);
      });
    } else {
      console.log('\nUploads directory does not exist.');
    }
    
  } catch (error) {
    console.error('Error checking collections:', error);
  } finally {
    process.exit(0);
  }
}

checkCollections();
