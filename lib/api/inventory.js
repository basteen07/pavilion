import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

const sendResponse = (data, status = 200) => {
    return NextResponse.json(data, { status });
};

export async function getInventoryHierarchy() {
    try {
        // We need Category -> SubCategory -> Brand -> Count
        // 1. Get all active categories
        const categoriesResult = await query('SELECT id, name FROM categories WHERE is_active = true ORDER BY name');
        const categories = categoriesResult.rows;

        // 2. Get all active sub-categories
        const subCategoriesResult = await query('SELECT id, name, category_id FROM sub_categories WHERE is_active = true ORDER BY name');
        const subCategories = subCategoriesResult.rows;

        // 3. Get brand product counts per sub-category
        // Note: Products link to Brand, Category, and SubCategory.
        // We want to count products for a specific Brand within a specific SubCategory.
        // Group by sub_category_id, brand_id
        const productCountsResult = await query(`
            SELECT 
                p.sub_category_id,
                p.brand_id,
                b.name as brand_name,
                COUNT(p.id) as count
            FROM products p
            JOIN brands b ON p.brand_id = b.id
            WHERE p.is_active = true AND b.is_active = true
            GROUP BY p.sub_category_id, p.brand_id, b.name
            ORDER BY b.name
        `);
        const counts = productCountsResult.rows;

        // 4. Build Hierarchy
        const hierarchy = categories.map(cat => {
            // Find subs for this cat
            const catSubs = subCategories.filter(sub => sub.category_id === cat.id);

            const processedSubs = catSubs.map(sub => {
                // Find counts for this sub
                // This gives us the brands that have products in this sub-category
                const subCounts = counts.filter(c => c.sub_category_id === sub.id);

                return {
                    id: sub.id,
                    name: sub.name,
                    brands: subCounts.map(sc => ({
                        id: sc.brand_id,
                        name: sc.brand_name,
                        count: parseInt(sc.count)
                    }))
                };
            });

            return {
                id: cat.id,
                name: cat.name,
                subCategories: processedSubs,
                totalProducts: processedSubs.reduce((acc, sub) => acc + sub.brands.reduce((bAcc, b) => bAcc + b.count, 0), 0)
            };
        });

        // Filter out empty categories if desired, or keep them. 
        // User implied "contain", usually implies showing structure.

        return sendResponse(hierarchy);

    } catch (error) {
        console.error('Error fetching inventory hierarchy:', error);
        return sendResponse({ error: 'Failed to fetch inventory hierarchy' }, 500);
    }
}
