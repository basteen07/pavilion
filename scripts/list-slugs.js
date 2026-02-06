const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
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
    connectionString: process.env.DATABASE_URL
});

async function listSlugs() {
    try {
        const result = await pool.query('SELECT slug FROM products LIMIT 10');
        console.log(result.rows.map(r => r.slug));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

listSlugs();
