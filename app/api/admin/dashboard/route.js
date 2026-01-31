import { NextResponse } from 'next/server';
import { query } from '@/lib/simple-db';
import { verifyToken } from '@/lib/auth';

// CORS helper
function handleCORS(response) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 200 }));
}

export async function GET(request) {
    try {
        // 1. Auth Check
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
        }
        const token = authHeader.substring(7);
        const payload = await verifyToken(token);
        if (!payload) {
            return handleCORS(NextResponse.json({ error: 'Invalid token' }, { status: 401 }));
        }
        const currentUserId = payload.userId;

        // 2. Fetch Stats
        // Parallelize queries for performance
        const statsQueries = [
            query('SELECT COUNT(*) FROM products'),
            query('SELECT COUNT(*) FROM b2b_customers'),
            query('SELECT COUNT(*) FROM quotations'),
            query("SELECT COUNT(*) FROM b2b_customers WHERE status = 'pending'")
        ];

        const [productsRes, customersRes, quotationsRes, pendingRes] = await Promise.all(statsQueries);

        const stats = {
            products: parseInt(productsRes.rows[0].count),
            customers: parseInt(customersRes.rows[0].count),
            quotations: parseInt(quotationsRes.rows[0].count),
            pending_approvals: parseInt(pendingRes.rows[0].count)
        };

        // 3. Fetch Activity Logs (Admin Logs)
        // Join with users to get admin name
        const adminLogsRes = await query(`
      SELECT l.*, u.name as admin_name, u.email as admin_email 
      FROM activity_logs l
      LEFT JOIN users u ON l.admin_id = u.id
      ORDER BY l.created_at DESC 
      LIMIT 20
    `);

        // 4. Fetch Wholesale Logs (B2B Events)
        // Join with customers and users to get company name and email
        const b2bLogsRes = await query(`
      SELECT e.*, c.company_name, u.email as customer_email
      FROM b2b_customer_events e
      LEFT JOIN b2b_customers c ON e.customer_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY e.created_at DESC 
      LIMIT 20
    `);

        // 5. Combine and Sort Activities
        const adminActivities = adminLogsRes.rows.map(log => ({
            id: `admin-${log.id}`,
            type: 'admin',
            event: log.event_type,
            description: log.description,
            user_name: log.admin_name || log.admin_email || 'System',
            timestamp: log.created_at,
            admin_id: log.admin_id,
            metadata: log.metadata
        }));

        const b2bActivities = b2bLogsRes.rows.map(log => ({
            id: `b2b-${log.id}`,
            type: 'wholesale',
            event: log.event_type,
            description: log.description,
            user_name: log.company_name || log.customer_email || 'Unknown Customer',
            timestamp: log.created_at,
            metadata: log.metadata
        }));

        const allActivities = [...adminActivities, ...b2bActivities].sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        ).slice(0, 50); // Keep top 50 recent events

        return handleCORS(NextResponse.json({
            stats,
            activities: allActivities,
            currentUserId: currentUserId
        }));

    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        // Return partial stats or error? Better to return error info but keep page alive ideally.
        // For now, simple 500.
        return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
