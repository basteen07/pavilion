import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

const sendResponse = (data, status = 200) => NextResponse.json(data, { status });

// GET /api/quotations
export async function getQuotations(searchParams) {
    try {
        const search = searchParams.get('search');
        const status = searchParams.get('status');
        const customerId = searchParams.get('customer_id');
        const dateFrom = searchParams.get('date_from');
        const dateTo = searchParams.get('date_to');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        // Lazy Migration: Add slug column if it doesn't exist
        await query(`ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS slug TEXT;`);

        let queryStr = `
            SELECT q.*, COALESCE(c.company_name, '') as customer_name, c.email as customer_email
            FROM quotations q
            LEFT JOIN customers c ON q.customer_id = c.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (search) {
            queryStr += ` AND (q.quotation_number ILIKE $${paramCount} OR c.company_name ILIKE $${paramCount} OR c.email ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (status) {
            queryStr += ` AND q.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (customerId) {
            queryStr += ` AND q.customer_id = $${paramCount}`;
            params.push(customerId);
            paramCount++;
        }

        if (dateFrom) {
            queryStr += ` AND q.created_at >= $${paramCount}`;
            params.push(dateFrom);
            paramCount++;
        }

        if (dateTo) {
            queryStr += ` AND q.created_at <= $${paramCount}`;
            params.push(dateTo + ' 23:59:59'); // Include entire day
            paramCount++;
        }

        const countQueryStr = `SELECT COUNT(*) FROM (${queryStr}) as total`;

        queryStr += ` ORDER BY q.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
        params.push(limit, offset);

        const [results, countResult] = await Promise.all([
            query(queryStr, params),
            query(countQueryStr, params.slice(0, params.length - 2))
        ]);

        const total = parseInt(countResult.rows[0].count);

        return sendResponse({
            quotations: results.rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error fetching quotations:', error);
        return sendResponse({ error: 'Failed to fetch quotations' }, 500);
    }
}

// GET /api/quotations/[id]
export async function getQuotationById(id) {
    try {
        const quoteRes = await query(`
            SELECT q.*, COALESCE(c.company_name, '') as customer_name, c.email as customer_email,
            c.phone as customer_phone, c.address as customer_address,
            c.company_name, c.gst_number
            FROM quotations q
            LEFT JOIN customers c ON q.customer_id = c.id
            WHERE q.id = $1
            `, [id]);

        if (quoteRes.rows.length === 0) return sendResponse({ error: 'Quotation not found' }, 404);

        const itemsRes = await query(`
            SELECT qi.*, p.dealer_price as current_dealer_price, p.mrp_price as current_mrp
            FROM quotation_items qi
            LEFT JOIN products p ON qi.product_id = p.id
            WHERE qi.quotation_id = $1
            `, [id]);

        return sendResponse({
            ...quoteRes.rows[0],
            items: itemsRes.rows
        });
    } catch (error) {
        console.error('Error fetching quotation:', error);
        return sendResponse({ error: 'Failed to fetch quotation' }, 500);
    }
}

// POST /api/quotations
export async function createQuotation(data, adminId = null) {
    try {
        const {
            customer_id, items, status, show_total, customer_snapshot,
            valid_until, shipping_cost, discount_type, discount_value,
            tax_rate, additional_notes, terms_and_conditions
        } = data;
        // items: [{ product_id, quantity, unit_price, product_name, variant_info, mrp, dealer_price, discount, slug }]

        // Calculate total if not provided
        const total_amount = data.total_amount || items.reduce((sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)), 0);

        // Generate Reference Number
        const reference_number = `QT-${Date.now().toString().slice(-6)}`;

        const quoteResult = await query(
            `INSERT INTO quotations(
                customer_id, status, show_total, customer_snapshot, total_amount, 
                reference_number, quotation_number, valid_until, shipping_cost, 
                discount_type, discount_value, tax_rate, notes, terms_conditions
            )
            VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING * `,
            [
                customer_id, status || 'Draft', show_total ?? true, customer_snapshot, total_amount,
                reference_number, reference_number, valid_until, shipping_cost || 0,
                discount_type || 'percentage', discount_value || 0, tax_rate || 18,
                additional_notes || '', terms_and_conditions || ''
            ]
        );

        const quotationId = quoteResult.rows[0].id;
        const quotationNumber = quoteResult.rows[0].quotation_number;

        // Insert items
        for (const item of items) {
            await query(
                `INSERT INTO quotation_items (
                    quotation_id, product_id, product_name, quantity, unit_price, 
                    total_price, line_total, mrp, dealer_price, discount, slug
                )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    quotationId,
                    item.product_id,
                    item.product_name,
                    item.quantity,
                    item.unit_price,
                    Number(item.unit_price) * Number(item.quantity),
                    Number(item.unit_price) * Number(item.quantity), // line_total
                    item.mrp || 0,
                    item.dealer_price || 0,
                    item.discount || 0,
                    item.slug || null
                ]
            );
        }

        // Log activity
        if (adminId) {
            try {
                const { logActivity } = await import('@/lib/activity-logger');
                await logActivity({
                    admin_id: adminId,
                    customer_id: customer_id,
                    quotation_id: quotationId,
                    event_type: 'quotation_created',
                    description: `Created quotation ${quotationNumber} (${status || 'Draft'}) - Amount: ₹${total_amount}`,
                    metadata: { quotation_number: quotationNumber, status: status || 'Draft', amount: total_amount, items_count: items.length }
                });
            } catch (logErr) {
                console.error('Failed to log quotation creation:', logErr.message);
            }
        }

        return sendResponse({ ...quoteResult.rows[0], items }, 201);
    } catch (error) {
        console.error('Error creating quotation:', error);
        return sendResponse({ error: 'Failed to create quotation' }, 500);
    }
}

// PUT /api/quotations/[id]
export async function updateQuotation(id, data, adminId = null) {
    try {
        const {
            items, status, show_total, customer_snapshot,
            valid_until, shipping_cost, discount_type, discount_value,
            tax_rate, additional_notes, terms_and_conditions
        } = data;

        // Calculate new total
        const total_amount = data.total_amount || items.reduce((sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)), 0);

        const quoteResult = await query(
            `UPDATE quotations SET
                status = COALESCE($1, status),
                show_total = COALESCE($2, show_total),
                customer_snapshot = COALESCE($3, customer_snapshot),
                total_amount = $4,
                valid_until = COALESCE($5, valid_until),
                shipping_cost = COALESCE($6, shipping_cost),
                discount_type = COALESCE($7, discount_type),
                discount_value = COALESCE($8, discount_value),
                tax_rate = COALESCE($9, tax_rate),
                notes = COALESCE($10, notes),
                terms_conditions = COALESCE($11, terms_conditions),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $12 RETURNING * `,
            [
                status, show_total, customer_snapshot, total_amount,
                valid_until, shipping_cost, discount_type, discount_value,
                tax_rate, additional_notes, terms_and_conditions, id
            ]
        );

        if (quoteResult.rows.length === 0) return sendResponse({ error: 'Quotation not found' }, 404);

        const quotationNumber = quoteResult.rows[0].quotation_number;
        const customerId = quoteResult.rows[0].customer_id;

        // Replace items
        await query(`DELETE FROM quotation_items WHERE quotation_id = $1`, [id]);

        for (const item of items) {
            await query(
                `INSERT INTO quotation_items(
                    quotation_id, product_id, product_name, quantity, unit_price, 
                    total_price, line_total, mrp, dealer_price, discount, slug
                )
                 VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    id,
                    item.product_id,
                    item.product_name,
                    item.quantity,
                    item.unit_price,
                    Number(item.unit_price) * Number(item.quantity),
                    Number(item.unit_price) * Number(item.quantity), // line_total
                    item.mrp || 0,
                    item.dealer_price || 0,
                    item.discount || 0,
                    item.slug || null
                ]
            );
        }

        // Log activity
        if (adminId) {
            try {
                const { logActivity } = await import('@/lib/activity-logger');
                await logActivity({
                    admin_id: adminId,
                    customer_id: customerId,
                    quotation_id: parseInt(id),
                    event_type: 'quotation_updated',
                    description: `Updated quotation ${quotationNumber} - Status: ${status || 'unchanged'}, Amount: ₹${total_amount}`,
                    metadata: { quotation_number: quotationNumber, status, amount: total_amount, items_count: items.length }
                });
            } catch (logErr) {
                console.error('Failed to log quotation update:', logErr.message);
            }
        }

        return sendResponse(quoteResult.rows[0]);

    } catch (error) {
        console.error('Error updating quotation:', error);
        return sendResponse({ error: 'Failed to update quotation' }, 500);
    }
}

// DELETE /api/quotations/[id]
// DELETE /api/quotations/[id]
export async function deleteQuotation(id, adminId) {
    try {
        // Fetch details before deletion for logging
        const quoteRes = await query(`
            SELECT q.quotation_number, q.total_amount, c.company_name, c.email
            FROM quotations q
            LEFT JOIN customers c ON q.customer_id = c.id
            WHERE q.id = $1
        `, [id]);

        if (quoteRes.rows.length > 0) {
            const q = quoteRes.rows[0];
            const description = `Deleted quotation ${q.quotation_number} for ${q.company_name || q.email || 'Unknown Customer'} (Amount: ${q.total_amount})`;

            // Log deletion activity
            if (adminId) {
                await import('@/lib/activity-logger').then(m => m.logActivity({
                    admin_id: adminId,
                    customer_id: null, // Don't link strictly to customer if not needed, or we could.
                    quotation_id: null, // Explicitly null as it's being deleted (though we fixed FK, meaningful link is gone)
                    event_type: 'quotation_deleted',
                    description: description,
                    metadata: {
                        quotation_number: q.quotation_number,
                        company_name: q.company_name,
                        amount: q.total_amount
                    }
                }));
            }
        }

        await query('DELETE FROM quotations WHERE id = $1', [id]);
        return sendResponse({ success: true });
    } catch (error) {
        console.error('Error deleting quotation:', error);
        return sendResponse({ error: 'Failed to delete quotation' }, 500);
    }
}
