/**
 * Script to inspect the current products table schema
 * Run with: node scripts/inspect-products-schema.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspectSchema() {
    const client = await pool.connect();
    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        log('=== Inspecting Products Table Schema ===\n');

        // Get products table columns
        const columnsResult = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'products'
            ORDER BY ordinal_position;
        `);

        log('PRODUCTS TABLE COLUMNS:');
        log('------------------------');
        columnsResult.rows.forEach(col => {
            log(`  ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });

        // Get indexes on products table
        const indexesResult = await client.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'products';
        `);

        log('\nPRODUCTS TABLE INDEXES:');
        log('-----------------------');
        indexesResult.rows.forEach(idx => {
            log(`  ${idx.indexname}`);
        });

        // Check if product_variants table exists
        const variantsTableResult = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_name LIKE '%variant%';
        `);

        log('\nVARIANT-RELATED TABLES:');
        log('-----------------------');
        if (variantsTableResult.rows.length === 0) {
            log('  No variant tables found');
        } else {
            variantsTableResult.rows.forEach(t => {
                log(`  ${t.table_name}`);
            });
        }

        // Check if product_options table exists
        const optionsTableResult = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_name LIKE '%option%';
        `);

        log('\nOPTION-RELATED TABLES:');
        log('----------------------');
        if (optionsTableResult.rows.length === 0) {
            log('  No option tables found');
        } else {
            optionsTableResult.rows.forEach(t => {
                log(`  ${t.table_name}`);
            });
        }

        // Get a sample product to see the variants JSONB structure
        const sampleProduct = await client.query(`
            SELECT id, sku, name, variants 
            FROM products 
            WHERE variants IS NOT NULL AND variants != '[]'::jsonb
            LIMIT 3;
        `);

        log('\nSAMPLE PRODUCTS WITH VARIANTS:');
        log('------------------------------');
        if (sampleProduct.rows.length === 0) {
            log('  No products with variants found');
        } else {
            sampleProduct.rows.forEach(p => {
                log(`  SKU: ${p.sku}`);
                log(`  Name: ${p.name}`);
                log(`  Variants: ${JSON.stringify(p.variants, null, 2)}`);
                log('');
            });
        }

        // Count total products
        const countResult = await client.query('SELECT COUNT(*) FROM products;');
        log(`\nTOTAL PRODUCTS: ${countResult.rows[0].count}`);

        // Write to file
        fs.writeFileSync('schema_output.txt', output);
        console.log('\n=== Output written to schema_output.txt ===');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

inspectSchema();
