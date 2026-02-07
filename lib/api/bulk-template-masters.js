import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

const sendResponse = (data, status = 200) => {
    return NextResponse.json(data, { status });
};

/**
 * GET /api/admin/bulk-template-masters
 * Fetches all active master data needed for the product bulk upload template.
 */
export async function getBulkTemplateMasters() {
    try {
        const [
            collections,
            categories,
            subCategories,
            brands,
            tags
        ] = await Promise.all([
            query('SELECT id, name FROM parent_collections WHERE is_active = true ORDER BY name'),
            query('SELECT id, name, parent_collection_id FROM categories WHERE is_active = true ORDER BY name'),
            query('SELECT id, name, category_id FROM sub_categories WHERE is_active = true ORDER BY name'),
            query('SELECT id, name, category_id, sub_category_id FROM brands WHERE is_active = true ORDER BY name'),
            query('SELECT id, name, sub_category_id FROM product_tags WHERE is_active = true ORDER BY name')
        ]);

        // Build hierarchy mapping
        const hierarchy = [];
        tags.rows.forEach(tag => {
            const subCat = subCategories.rows.find(sc => sc.id === tag.sub_category_id);
            if (subCat) {
                const cat = categories.rows.find(c => c.id === subCat.category_id);
                if (cat) {
                    const coll = collections.rows.find(c => c.id === cat.parent_collection_id);
                    hierarchy.push({
                        collection: coll ? coll.name : '',
                        category: cat.name,
                        subCategory: subCat.name,
                        tag: tag.name
                    });
                }
            }
        });

        // Add categories that might not have tags
        categories.rows.forEach(cat => {
            const hasSub = subCategories.rows.some(sc => sc.category_id === cat.id);
            if (!hasSub) {
                const coll = collections.rows.find(c => c.id === cat.parent_collection_id);
                hierarchy.push({
                    collection: coll ? coll.name : '',
                    category: cat.name,
                    subCategory: '',
                    tag: ''
                });
            }
        });

        return sendResponse({
            collections: collections.rows,
            categories: categories.rows,
            subCategories: subCategories.rows,
            brands: brands.rows,
            tags: tags.rows,
            hierarchy: hierarchy
        });
    } catch (error) {
        console.error('Error fetching bulk template masters:', error);
        return sendResponse({ error: 'Failed to fetch master data for template' }, 500);
    }
}
