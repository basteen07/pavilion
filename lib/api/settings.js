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

        const settings = {};

        // 1. Fetch from system_settings (Key-Value)
        let systemQuery = `SELECT key, value FROM system_settings`;
        const systemParams = [];
        if (keys.length > 0) {
            systemQuery += ` WHERE key = ANY($1)`;
            systemParams.push(keys);
        }
        const systemResult = await query(systemQuery, systemParams);
        systemResult.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        // 2. Fetch from site_settings (Column-based) - Legacy/Alternative
        try {
            const siteResult = await query(`SELECT * FROM site_settings LIMIT 1`);
            if (siteResult.rows.length > 0) {
                const siteRow = siteResult.rows[0];
                Object.keys(siteRow).forEach(col => {
                    // Only merge if not already found in system_settings OR if explicitly requested
                    if (!settings[col] && (keys.length === 0 || keys.includes(col))) {
                        settings[col] = siteRow[col];
                    }
                });
            }
        } catch (e) {
            // Silently skip if table missing or error
        }

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
