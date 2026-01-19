const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function updateSchema() {
    try {
        await client.connect();
        console.log('Connected to database');

        // Start transaction
        await client.query('BEGIN');

        // Create customer_types table
        console.log('Creating customer_types table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS customer_types (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL UNIQUE,
                base_price_type TEXT NOT NULL CHECK (base_price_type IN ('dealer', 'mrp')),
                percentage NUMERIC NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert default customer types if they don't exist
        const defaultTypes = [
            { name: 'General', base_price_type: 'mrp', percentage: 0 },
            { name: 'Dealer', base_price_type: 'dealer', percentage: 0 },
            { name: 'Wholesale', base_price_type: 'dealer', percentage: 5 }
        ];

        for (const type of defaultTypes) {
            await client.query(`
                INSERT INTO customer_types (name, base_price_type, percentage)
                VALUES ($1, $2, $3)
                ON CONFLICT (name) DO NOTHING
            `, [type.name, type.base_price_type, type.percentage]);
        }

        // Add customer_type_id and contacts JSONB to customers table
        console.log('Updating customers table columns...');
        await client.query(`
            ALTER TABLE customers 
            ADD COLUMN IF NOT EXISTS customer_type_id UUID REFERENCES customer_types(id),
            ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb
        `);

        // Migrate existing 'type' string to customer_type_id
        console.log('Migrating existing customer types...');
        const customers = await client.query('SELECT id, type FROM customers WHERE customer_type_id IS NULL');

        for (const customer of customers.rows) {
            if (customer.type) {
                // Try to find a matching customer type
                const typeResult = await client.query('SELECT id FROM customer_types WHERE name ILIKE $1', [customer.type]);
                if (typeResult.rows.length > 0) {
                    await client.query('UPDATE customers SET customer_type_id = $1 WHERE id = $2', [typeResult.rows[0].id, customer.id]);
                } else {
                    // Default to General
                    const generalResult = await client.query("SELECT id FROM customer_types WHERE name = 'General'");
                    await client.query('UPDATE customers SET customer_type_id = $1 WHERE id = $2', [generalResult.rows[0].id, customer.id]);
                }
            } else {
                // Default to General
                const generalResult = await client.query("SELECT id FROM customer_types WHERE name = 'General'");
                await client.query('UPDATE customers SET customer_type_id = $1 WHERE id = $2', [generalResult.rows[0].id, customer.id]);
            }
        }

        // Migrate primary_contact_* to contacts JSONB
        console.log('Migrating contact info to contacts JSONB...');
        const contactInfo = await client.query(`
            SELECT id, primary_contact_name, primary_contact_email, primary_contact_phone, name 
            FROM customers 
            WHERE contacts = '[]'::jsonb OR contacts IS NULL
        `);

        for (const customer of contactInfo.rows) {
            const contacts = [];
            if (customer.primary_contact_name || customer.primary_contact_email || customer.primary_contact_phone) {
                contacts.push({
                    name: customer.primary_contact_name || customer.name || 'Contact',
                    email: customer.primary_contact_email || '',
                    phone: customer.primary_contact_phone || '',
                    is_primary: true,
                    designation: 'Primary Contact'
                });
            }
            await client.query('UPDATE customers SET contacts = $1 WHERE id = $2', [JSON.stringify(contacts), customer.id]);
        }

        await client.query('COMMIT');
        console.log('Schema update completed successfully');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating schema:', err);
    } finally {
        await client.end();
    }
}

updateSchema();
