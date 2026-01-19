import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

function handleCORS(response) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
}

export async function getCustomerTypes() {
    try {
        const result = await query('SELECT * FROM customer_types ORDER BY name ASC');
        return handleCORS(NextResponse.json(result.rows));
    } catch (error) {
        console.error('Error fetching customer types:', error);
        return handleCORS(NextResponse.json({ error: 'Failed to fetch customer types' }, { status: 500 }));
    }
}

export async function createCustomerType(data) {
    const { name, base_price_type, percentage } = data;

    if (!name || !base_price_type) {
        return handleCORS(NextResponse.json({ error: 'Name and base price type are required' }, { status: 400 }));
    }

    try {
        const result = await query(
            `INSERT INTO customer_types (name, base_price_type, percentage) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [name, base_price_type, percentage || 0]
        );
        return handleCORS(NextResponse.json(result.rows[0]));
    } catch (error) {
        console.error('Error creating customer type:', error);
        return handleCORS(NextResponse.json({ error: 'Failed to create customer type' }, { status: 500 }));
    }
}

export async function updateCustomerType(id, data) {
    const { name, base_price_type, percentage } = data;

    try {
        const result = await query(
            `UPDATE customer_types 
             SET name = COALESCE($1, name), 
                 base_price_type = COALESCE($2, base_price_type), 
                 percentage = COALESCE($3, percentage) 
             WHERE id = $4 
             RETURNING *`,
            [name, base_price_type, percentage, id]
        );

        if (result.rows.length === 0) {
            return handleCORS(NextResponse.json({ error: 'Customer type not found' }, { status: 404 }));
        }

        return handleCORS(NextResponse.json(result.rows[0]));
    } catch (error) {
        console.error('Error updating customer type:', error);
        return handleCORS(NextResponse.json({ error: 'Failed to update customer type' }, { status: 500 }));
    }
}

export async function deleteCustomerType(id) {
    try {
        // Check if assigned to any customers
        const checkResult = await query('SELECT id FROM customers WHERE customer_type_id = $1 LIMIT 1', [id]);
        if (checkResult.rows.length > 0) {
            return handleCORS(NextResponse.json({ error: 'Cannot delete customer type as it is assigned to customers' }, { status: 400 }));
        }

        await query('DELETE FROM customer_types WHERE id = $1', [id]);
        return handleCORS(NextResponse.json({ success: true }));
    } catch (error) {
        console.error('Error deleting customer type:', error);
        return handleCORS(NextResponse.json({ error: 'Failed to delete customer type' }, { status: 500 }));
    }
}
