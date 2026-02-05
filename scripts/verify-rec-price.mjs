import { query } from '../lib/simple-db.js';

async function verify() {
    try {
        console.log('Checking quotation_items columns...');
        const columns = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'quotation_items' AND column_name = 'recommended_price'
        `);

        if (columns.rows.length > 0) {
            console.log('SUCCESS: recommended_price column exists in quotation_items');
        } else {
            console.log('FAILURE: recommended_price column MISSING in quotation_items');
        }

        console.log('Sampling quotation items with recommended_price > 0...');
        const samples = await query(`
            SELECT product_name, recommended_price 
            FROM quotation_items 
            WHERE recommended_price > 0 
            LIMIT 5
        `);

        if (samples.rows.length > 0) {
            console.log('Found saved recommended prices:');
            console.table(samples.rows);
        } else {
            console.log('No quotation items with recommended_price > 0 found yet. (This is expected if no new quotes have been saved with this data)');
        }

    } catch (err) {
        console.error('Error during verification:', err);
    } finally {
        process.exit();
    }
}

verify();
