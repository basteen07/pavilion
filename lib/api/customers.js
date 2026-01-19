import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

const sendResponse = (data, status = 200) => NextResponse.json(data, { status });

// GET /api/customers
export async function getCustomers(searchParams) {
    try {
        const search = searchParams.get('search');
        const type = searchParams.get('type'); // This will now match customer_types.name or customer_type_id
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        let queryStr = `
            SELECT c.*, ct.name as customer_type_name, ct.percentage, ct.base_price_type
            FROM customers c
            LEFT JOIN customer_types ct ON c.customer_type_id = ct.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (search) {
            queryStr += ` AND (c.email ILIKE $${paramCount} OR c.company_name ILIKE $${paramCount} OR c.phone ILIKE $${paramCount} OR c.name ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (type && type !== 'all') {
            // Check if 'type' is a numeric ID or a string name
            const isNumeric = /^\d+$/.test(type);
            if (isNumeric) {
                queryStr += ` AND c.customer_type_id = $${paramCount}`;
            } else {
                queryStr += ` AND ct.name = $${paramCount}`;
            }
            params.push(type);
            paramCount++;
        }

        const countQueryStr = `SELECT COUNT(*) FROM (${queryStr}) as total`;

        queryStr += ` ORDER BY c.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
        params.push(limit, offset);

        const [results, countResult] = await Promise.all([
            query(queryStr, params),
            query(countQueryStr, params.slice(0, params.length - 2))
        ]);

        const total = parseInt(countResult.rows[0].count);

        return sendResponse({
            customers: results.rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        return sendResponse({ error: 'Failed to fetch customers' }, 500);
    }
}

// GET /api/customers/[id]
export async function getCustomerById(id) {
    try {
        const result = await query(`
            SELECT c.*, ct.name as customer_type_name, ct.percentage, ct.base_price_type
            FROM customers c
            LEFT JOIN customer_types ct ON c.customer_type_id = ct.id
            WHERE c.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return sendResponse({ error: 'Customer not found' }, 404);
        }

        return sendResponse(result.rows[0]);
    } catch (error) {
        console.error('Error fetching customer:', error);
        return sendResponse({ error: 'Failed to fetch customer' }, 500);
    }
}

// POST /api/customers
export async function createCustomer(data) {
    try {
        const {
            name, email, phone, address, customer_type_id, type,
            company_name, gst_number, contacts
        } = data;

        if (!name || !email) {
            return sendResponse({ error: 'Name and Email are required' }, 400);
        }

        // Set legacy fields for backward compatibility
        const legacyType = type || 'General';

        const result = await query(
            `INSERT INTO customers (
                name, email, phone, address, customer_type_id, type, 
                company_name, gst_number, contacts
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [
                name, email, phone || '', address || '',
                (customer_type_id && (/^[0-9a-fA-F-]{36}$/.test(customer_type_id) || /^\d+$/.test(customer_type_id))) ? customer_type_id : null, legacyType,
                company_name || name || '', gst_number || '',
                JSON.stringify(contacts || [])
            ]
        );

        // Fetch full record with joined type
        const fullRecord = await query(`
            SELECT c.*, ct.name as customer_type_name, ct.percentage, ct.base_price_type
            FROM customers c
            LEFT JOIN customer_types ct ON c.customer_type_id = ct.id
            WHERE c.id = $1
        `, [result.rows[0].id]);

        return sendResponse(fullRecord.rows[0], 201);
    } catch (error) {
        if (error.code === '23505') {
            return sendResponse({ error: 'Customer with this email already exists' }, 409);
        }
        console.error('Error creating customer:', error);
        return sendResponse({ error: 'Failed to create customer' }, 500);
    }
}

// PUT /api/customers/[id]
export async function updateCustomer(id, data) {
    try {
        const {
            name, email, phone, address, customer_type_id, type,
            company_name, gst_number, contacts
        } = data;

        const result = await query(
            `UPDATE customers SET 
                name = COALESCE($1, name),
                email = COALESCE($2, email), 
                phone = COALESCE($3, phone),
                address = COALESCE($4, address),
                customer_type_id = $5,
                type = COALESCE($6, type),
                company_name = COALESCE($7, company_name),
                gst_number = COALESCE($8, gst_number),
                contacts = COALESCE($9, contacts),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10 RETURNING id`,
            [
                name, email, phone, address,
                (customer_type_id && (/^[0-9a-fA-F-]{36}$/.test(customer_type_id) || /^\d+$/.test(customer_type_id))) ? customer_type_id : null, type,
                company_name, gst_number,
                contacts ? JSON.stringify(contacts) : null,
                id
            ]
        );

        if (result.rows.length === 0) return sendResponse({ error: 'Customer not found' }, 404);

        // Fetch full record with joined type
        const fullRecord = await query(`
            SELECT c.*, ct.name as customer_type_name, ct.percentage, ct.base_price_type
            FROM customers c
            LEFT JOIN customer_types ct ON c.customer_type_id = ct.id
            WHERE c.id = $1
        `, [id]);

        return sendResponse(fullRecord.rows[0]);
    } catch (error) {
        console.error('Error updating customer:', error);
        return sendResponse({ error: 'Failed to update customer' }, 500);
    }
}

