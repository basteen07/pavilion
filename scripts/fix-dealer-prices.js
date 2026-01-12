// Script to populate missing dealer_price values
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://root:gdF4CHLIrUX0JMFop11SW8tr9Y6Tk67d@dpg-d534alggjchc73eu0eeg-a.virginia-postgres.render.com/pavilion_npg7',
    ssl: {
        rejectUnauthorized: false
    }
});

async function fixDealerPrices() {
    try {
        console.log('Starting dealer_price fix...');

        // Update products where dealer_price is NULL or 0
        // Use mrp_price * 0.7 as a fallback
        const result = await pool.query(`
      UPDATE products 
      SET dealer_price = ROUND(mrp_price * 0.7, 2)
      WHERE dealer_price IS NULL OR dealer_price = 0
      RETURNING id, name, sku, mrp_price, dealer_price
    `);

        console.log(`Successfully updated ${result.rowCount} products.`);

        if (result.rowCount > 0) {
            console.log('Sample updates:');
            result.rows.slice(0, 5).forEach(row => {
                console.log(`- ${row.name} (${row.sku}): MRP ${row.mrp_price} -> Dealer ${row.dealer_price}`);
            });
        }

        console.log('Dealer price fix completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing dealer prices:', error);
        process.exit(1);
    }
}

fixDealerPrices();
