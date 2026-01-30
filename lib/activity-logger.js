
import { query } from '@/lib/simple-db';

export async function logActivity({ admin_id, customer_id, quotation_id, order_id, event_type, description, metadata = {} }) {
    console.log('[Activity Log Debug] Attempting to log:', { admin_id, event_type, description });
    try {
        const res = await query(
            `INSERT INTO activity_logs (admin_id, customer_id, quotation_id, order_id, event_type, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [admin_id, customer_id, quotation_id, order_id, event_type, description, JSON.stringify(metadata)]
        );
        console.log('[Activity Log Debug] Success! Log ID:', res.rows[0]?.id);
    } catch (err) {
        console.error('[Activity Log Debug] Failed to log activity:', err.message);
        console.error('[Activity Log Debug] Data:', { admin_id, event_type, description, metadata });
    }
}
