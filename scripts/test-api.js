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

async function test() {
    try {
        const slug = process.argv[2];
        if (!slug) {
            console.error('Please provide a slug');
            process.exit(1);
        }

        const result = await pool.query(`
            SELECT 
                p.*, 
                COALESCE(
                    (SELECT json_agg(
                        json_build_object(
                            'id', pv.id,
                            'sku', pv.sku,
                            'images', pv.images,
                            'is_default', pv.is_default
                        )
                    ) FROM product_variants pv 
                    WHERE pv.product_id = p.id AND pv.is_active = true),
                    '[]'::json
                ) as product_variants
            FROM products p
            WHERE p.slug = $1`, [slug]);

        console.log(JSON.stringify(result.rows[0], null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

test();
