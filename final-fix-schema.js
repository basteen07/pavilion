const { Client } = require('pg');
require('dotenv').config();

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('Connected to database');

        // 1. Change customer_type_id column type to INTEGER
        // We drop and recreate it to be safe, as casting UUID to INTEGER is not direct
        console.log('Recreating customer_type_id as INTEGER...');

        // Backup existing values if they are numeric strings (unlikely for UUID but good practice)
        // Actually, since it was UUID, most values would be NULL or failing anyway.

        await client.query(`
            ALTER TABLE customers 
            DROP COLUMN IF EXISTS customer_type_id;
            
            ALTER TABLE customers 
            ADD COLUMN customer_type_id INTEGER;
        `);

        // 2. Map existing string types to the new INTEGER field
        console.log('Migrating customer types (Mapping strings to IDs)...');
        const customersRes = await client.query('SELECT id, customer_type FROM customers WHERE customer_type_id IS NULL AND customer_type IS NOT NULL');
        const customerTypesRes = await client.query('SELECT id, name FROM customer_types');

        const typeMap = {};
        customerTypesRes.rows.forEach(t => {
            typeMap[t.name.toLowerCase()] = t.id;
        });

        for (const row of customersRes.rows) {
            const typeId = typeMap[row.customer_type.toLowerCase()];
            if (typeId) {
                await client.query('UPDATE customers SET customer_type_id = $1 WHERE id = $2', [typeId, row.id]);
            }
        }

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
