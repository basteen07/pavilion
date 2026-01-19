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

        // 1. Add missing columns
        console.log('Adding columns...');
        await client.query(`
            ALTER TABLE customers 
            ADD COLUMN IF NOT EXISTS name TEXT,
            ADD COLUMN IF NOT EXISTS customer_type_id UUID,
            ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb
        `);

        // 2. Map existing string types to the new UUID field if any
        console.log('Migrating customer types...');
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

        // 3. Migrate existing contact info to JSONB if contacts is empty
        console.log('Migrating contact info to JSONB and setting name...');
        const contactsToMigrate = await client.query(`
            SELECT id, company_name, contact_person, email, phone, primary_contact_name, primary_contact_email, primary_contact_phone, name 
            FROM customers 
            WHERE contacts = '[]'::jsonb OR name IS NULL
        `);

        for (const row of contactsToMigrate.rows) {
            const customerName = row.name || row.company_name || 'Unnamed Customer';
            const contact = {
                name: row.primary_contact_name || row.contact_person || customerName,
                email: row.primary_contact_email || row.email || '',
                phone: row.primary_contact_phone || row.phone || '',
                is_primary: true
            };
            await client.query('UPDATE customers SET contacts = $1, name = $2 WHERE id = $3', [JSON.stringify([contact]), customerName, row.id]);
        }

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
