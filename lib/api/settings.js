import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

const sendResponse = (data, status = 200) => NextResponse.json(data, { status });

// Lazy Migration: Ensure system_settings table exists
async function ensureSettingsTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS system_settings (
            id SERIAL PRIMARY KEY,
            key VARCHAR(255) UNIQUE NOT NULL,
            value TEXT,
            type VARCHAR(50) DEFAULT 'string',
            description TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

export async function getSettings(keys = []) {
    try {
        await ensureSettingsTable();
        let queryStr = `SELECT key, value, type FROM system_settings`;
        const params = [];

        if (keys.length > 0) {
            queryStr += ` WHERE key = ANY($1)`;
            params.push(keys);
        }

        const result = await query(queryStr, params);

        // Convert to object { key: value }
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        return sendResponse(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        return sendResponse({ error: 'Failed to fetch settings' }, 500);
    }
}

export async function updateSettings(settings) {
    try {
        await ensureSettingsTable();

        for (const [key, value] of Object.entries(settings)) {
            await query(`
                INSERT INTO system_settings (key, value)
                VALUES ($1, $2)
                ON CONFLICT (key) DO UPDATE SET 
                    value = EXCLUDED.value,
                    updated_at = CURRENT_TIMESTAMP
            `, [key, value]);
        }

        return sendResponse({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        return sendResponse({ error: 'Failed to update settings' }, 500);
    }
}
