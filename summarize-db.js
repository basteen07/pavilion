const { Client } = require('pg');
require('dotenv').config();

async function summarize() {
    const fs = require('fs');
    const logFile = fs.createWriteStream('db-summary.txt');
    const log = (msg) => {
        console.log(msg);
        logFile.write(msg + '\n');
    };

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        const cats = await client.query('SELECT id, name FROM categories');
        log('--- CATEGORIES ---');
        for (const cat of cats.rows) {
            log(`[${cat.id}] ${cat.name}`);
            const subs = await client.query('SELECT id, name FROM sub_categories WHERE category_id = $1', [cat.id]);
            for (const sub of subs.rows) {
                log(`  -> [${sub.id}] ${sub.name}`);
                const tags = await client.query('SELECT id, name FROM product_tags WHERE sub_category_id = $1', [sub.id]);
                if (tags.rows.length > 0) {
                    log(`     Tags: ${tags.rows.map(t => t.name).join(', ')}`);
                }
            }
        }
    } catch (err) {
        log(err.toString());
    } finally {
        await client.end();
        logFile.end();
    }
}

summarize();
