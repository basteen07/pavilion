import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        console.log('=== Starting 500 Product Seeding & Update ===');

        // Step -1: Cleanup
        console.log('Step -1: Cleaning up existing products...');
        await query('DELETE FROM products');

        // Step 0: Data Normalization for existing products
        console.log('Step 0: Normalizing existing product data...');
        await query(`
            UPDATE products 
            SET 
                dealer_price = COALESCE(dealer_price, mrp_price * 0.7),
                selling_price = COALESCE(selling_price, mrp_price * 0.85),
                discount_percentage = COALESCE(discount_percentage, 15),
                is_active = COALESCE(is_active, true),
                allow_quote = COALESCE(allow_quote, true),
                images = CASE WHEN images IS NULL OR images::text = '[]' THEN '["/placeholder.png"]'::jsonb ELSE images END,
                updated_at = CURRENT_TIMESTAMP
            WHERE mrp_price IS NOT NULL
        `);

        // Sports categories with their subcategories and brands
        const sportsData = {
            'Cricket': {
                subcategories: ['Cricket Bats', 'Leather Balls', 'Batting Gloves', 'Leg Guards', 'Helmets', 'Cricket Whites', 'Cricket Shoes', 'Cricket Bags'],
                brands: ['SG', 'SS', 'MRF', 'Kookaburra', 'Gray-Nicolls', 'Adidas', 'Nike'],
                imagePrefix: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da' // Cricket
            },
            'Football': {
                subcategories: ['Football Balls', 'Football Shoes', 'Jerseys', 'Shin Guards', 'Goalkeeper Gloves', 'Football Bags'],
                brands: ['Nike', 'Adidas', 'Puma', 'Nivia', 'Cosco'],
                imagePrefix: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018' // Football
            },
            'Basketball': {
                subcategories: ['Basketballs', 'Basketball Shoes', 'Jerseys', 'Basketball Hoops', 'Training Bibs'],
                brands: ['Nike', 'Spalding', 'Wilson', 'Adidas', 'Nivia'],
                imagePrefix: 'https://images.unsplash.com/photo-1546519638-68e109498ffc' // Basketball
            },
            'Tennis': {
                subcategories: ['Tennis Rackets', 'Tennis Balls', 'Tennis Shoes', 'Tennis Bags', 'Training Nets'],
                brands: ['Wilson', 'Yonex', 'Babolat', 'Head', 'Nike'],
                imagePrefix: 'https://images.unsplash.com/photo-1595435066319-3f044955740a' // Tennis
            },
            'Badminton': {
                subcategories: ['Badminton Rackets', 'Shuttlecocks', 'Badminton Shoes', 'Racket Bags', 'Nets'],
                brands: ['Yonex', 'Li-Ning', 'Victor', 'Apacs'],
                imagePrefix: 'https://images.unsplash.com/photo-1626225967045-2c76b2296f30' // Badminton
            }
        };

        // Step 1: Ensure categories exist (UUID based)
        console.log('Step 1: Setting up categories...');
        const categoryMap = {};
        for (const catName of Object.keys(sportsData)) {
            const slug = catName.toLowerCase().replace(/\s+/g, '-');
            let catId;
            const check = await query('SELECT id FROM categories WHERE name = $1', [catName]);
            if (check.rows.length === 0) {
                const res = await query(
                    'INSERT INTO categories (name, slug, is_active) VALUES ($1, $2, true) RETURNING id',
                    [catName, slug]
                );
                catId = res.rows[0].id;
                console.log(`Created Category: ${catName} (${catId})`);
            } else {
                catId = check.rows[0].id;
                console.log(`Found Category: ${catName} (${catId})`);
            }
            categoryMap[catName] = catId;
        }

        // Step 2: Ensure subcategories exist (Integer based with UUID category_id)
        console.log('Step 2: Setting up subcategories...');
        const subCategoryMap = {};
        for (const [catName, catData] of Object.entries(sportsData)) {
            const categoryId = categoryMap[catName];
            for (const subCatName of catData.subcategories) {
                const key = `${catName}_${subCatName}`;
                const check = await query(
                    'SELECT id FROM sub_categories WHERE name = $1 AND category_id = $2',
                    [subCatName, categoryId]
                );
                if (check.rows.length === 0) {
                    const res = await query(
                        'INSERT INTO sub_categories (name, category_id, is_active) VALUES ($1, $2, true) RETURNING id',
                        [subCatName, categoryId]
                    );
                    subCategoryMap[key] = res.rows[0].id;
                    console.log(`Created Sub-Category: ${subCatName} in ${catName} (ID: ${res.rows[0].id})`);
                } else {
                    subCategoryMap[key] = check.rows[0].id;
                    console.log(`Found Sub-Category: ${subCatName} in ${catName} (ID: ${check.rows[0].id})`);
                }
            }
        }

        // Step 3: Ensure brands exist (UUID based)
        console.log('Step 3: Setting up brands...');
        const allBrands = new Set();
        Object.values(sportsData).forEach(cat => cat.brands.forEach(b => allBrands.add(b)));
        const brandMap = {};
        for (const brandName of allBrands) {
            const slug = brandName.toLowerCase().replace(/\s+/g, '-');
            const check = await query('SELECT id FROM brands WHERE name = $1', [brandName]);
            if (check.rows.length === 0) {
                const res = await query(
                    'INSERT INTO brands (name, slug, is_active) VALUES ($1, $2, true) RETURNING id',
                    [brandName, slug]
                );
                brandMap[brandName] = res.rows[0].id;
                console.log(`Created Brand: ${brandName} (${res.rows[0].id})`);
            } else {
                brandMap[brandName] = check.rows[0].id;
                console.log(`Found Brand: ${brandName} (${check.rows[0].id})`);
            }
        }

        // Step 4: Generate and insert 500 products
        console.log('Step 4: Generating 500 products...');
        let created = 0;
        let updated = 0;
        let productCounter = 0;

        const priceRanges = {
            'Rackets': [1500, 35000], 'Balls': [200, 3000], 'Shoes': [2500, 25000],
            'Jerseys': [800, 8000], 'Gloves': [500, 15000], 'Bags': [1200, 18000],
            'Bats': [2000, 45000], 'Helmets': [1500, 25000], 'Pads': [1000, 20000],
            'default': [1000, 15000]
        };

        const adjectives = ['Pro', 'Elite', 'Premium', 'Professional', 'Advanced', 'Master', 'Champion', 'Expert', 'Supreme', 'Ultimate', 'Lite', 'Carbon'];

        const cats = Object.keys(sportsData);
        const totalToGenerate = 500;
        const perCat = Math.ceil(totalToGenerate / cats.length);

        for (const catName of cats) {
            const categoryId = categoryMap[catName];
            const subcategories = sportsData[catName].subcategories;
            const brands = sportsData[catName].brands;

            for (let i = 0; i < perCat; i++) {
                if (productCounter >= totalToGenerate) break;

                const subCat = subcategories[i % subcategories.length];
                const brand = brands[i % brands.length];
                const subCategoryId = subCategoryMap[`${catName}_${subCat}`];
                const brandId = brandMap[brand];

                const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
                const name = `${brand} ${adj} ${subCat} ${i + 1}`;
                const sku = `SP-${catName.substring(0, 3).toUpperCase()}-${brand.substring(0, 3).toUpperCase()}-${String(i).padStart(3, '0')}`;
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

                // Logic for prices
                let matchRange = Object.keys(priceRanges).find(k => subCat.includes(k)) || 'default';
                const range = priceRanges[matchRange];
                const mrp = Math.floor(Math.random() * (range[1] - range[0])) + range[0];
                const dealerPrice = Math.floor(mrp * 0.7);
                const sellingPrice = Math.floor(mrp * 0.85);

                const images = [sportsData[catName].imagePrefix + `?q=80&w=800&auto=format&fit=crop`];

                try {
                    const res = await query(`
                        INSERT INTO products (
                            sku, name, slug, brand_id, category_id, sub_category_id,
                            mrp_price, dealer_price, selling_price, discount_percentage,
                            short_description, description, stock_quantity,
                            images, is_featured, is_active, allow_quote, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        ON CONFLICT (sku) DO UPDATE SET
                            name = EXCLUDED.name,
                            slug = EXCLUDED.slug,
                            brand_id = EXCLUDED.brand_id,
                            category_id = EXCLUDED.category_id,
                            sub_category_id = EXCLUDED.sub_category_id,
                            mrp_price = EXCLUDED.mrp_price,
                            dealer_price = EXCLUDED.dealer_price,
                            selling_price = EXCLUDED.selling_price,
                            discount_percentage = EXCLUDED.discount_percentage,
                            short_description = EXCLUDED.short_description,
                            description = EXCLUDED.description,
                            images = EXCLUDED.images,
                            updated_at = CURRENT_TIMESTAMP
                        RETURNING (xmax = 0) AS inserted;
                    `, [
                        sku, name, slug, brandId, categoryId, subCategoryId,
                        mrp, dealerPrice, sellingPrice, 15,
                        `High performance ${subCat}`,
                        `Professional grade ${name} specifically designed for ${catName} athletes who demand the best in quality and performance. Featuring advanced materials and ergonomic design.`,
                        Math.floor(Math.random() * 100) + 10,
                        JSON.stringify(images),
                        (i < 5), // first 5 per cat are featured
                        true, true
                    ]);

                    if (res.rows[0].inserted) created++; else updated++;
                    productCounter++;

                    if (productCounter % 100 === 0) {
                        console.log(`Progress: ${productCounter} products processed...`);
                    }
                } catch (perErr) {
                    console.error(`Error processing product ${sku}:`, perErr.message);
                }
            }
        }

        console.log('=== Seeding Complete ===');

        return NextResponse.json({
            success: true,
            summary: {
                total: productCounter,
                created,
                updated,
                categories: Object.keys(categoryMap).length,
                brands: Object.keys(brandMap).length,
                subcategories: Object.keys(subCategoryMap).length
            }
        });

    } catch (error) {
        console.error('Seed error:', error);
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
