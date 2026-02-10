const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load env vars manually
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value && !process.env[key]) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Connected to database...');

        console.log('Adding new option columns to products and product_variants tables...');

        const tables = ['products', 'product_variants'];

        for (const table of tables) {
            console.log(`Updating table: ${table}`);
            await pool.query(`
                ALTER TABLE ${table}
                ADD COLUMN IF NOT EXISTS option1_name TEXT,
                ADD COLUMN IF NOT EXISTS option1_value TEXT,
                ADD COLUMN IF NOT EXISTS option2_name TEXT,
                ADD COLUMN IF NOT EXISTS option2_value TEXT,
                ADD COLUMN IF NOT EXISTS option3_name TEXT,
                ADD COLUMN IF NOT EXISTS option3_value TEXT,
                ADD COLUMN IF NOT EXISTS option4_name TEXT,
                ADD COLUMN IF NOT EXISTS option4_value TEXT;
            `);
        }

        console.log('Schema update complete!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
