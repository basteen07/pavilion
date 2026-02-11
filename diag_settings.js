const { Pool } = require('pg');
require('dotenv').config();

const oreURL = 'postgresql://root:BmZnYu6nbQWm1vNniHReXpBKZwpVQG5A@dpg-d5mv1nre5dus73epm57g-a.oregon-postgres.render.com/pavilion_t41u?sslmode=require';
const virURL = 'postgresql://root:gdF4CHLIrUX0JMFop11SW8tr9Y6Tk67d@dpg-d534alggjchc73eu0eeg-a.virginia-postgres.render.com/pavilion_npg7';

async function check(name, url) {
    const pool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false }
    });
    try {
        const res = await pool.query('SELECT key, value FROM system_settings WHERE key = $1', ['organization_schema']);
        console.log(`--- ${name} ---`);
        if (res.rows.length > 0) {
            console.log('Value:', res.rows[0].value);
        } else {
            console.log('KEY NOT FOUND');
        }
    } catch (err) {
        console.error(`${name} Error:`, err.message);
    } finally {
        await pool.end();
    }
}

async function run() {
    console.log('ENV DATABASE_URL:', process.env.DATABASE_URL?.split('@')[1] || 'MISSING');
    await check('OREGON (pavilion_t41u)', oreURL);
    await check('VIRGINIA (pavilion_npg7)', virURL);
}

run();
