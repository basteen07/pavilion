/**
 * Next.js Instrumentation - runs once on server startup.
 * Used to create performance indexes on the database.
 */
export async function register() {
    // Only run on the server (not edge runtime)
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            const { runPerformanceIndexes } = await import('@/lib/db-indexes');
            await runPerformanceIndexes();
            console.log('✓ Performance indexes verified');
        } catch (err) {
            // Non-fatal — app works without indexes, just slower
            console.warn('⚠ Could not create performance indexes:', err.message);
        }
        try {
            // Product URLs use the product name (spaces -> hyphens); converts existing products once
            const { convertAllProductSlugs } = await import('@/lib/product-slug');
            const changed = await convertAllProductSlugs();
            if (changed) console.log(`✓ Product URLs updated to use product names (${changed} products)`);
        } catch (err) {
            console.warn('⚠ Could not update product URL slugs:', err.message);
        }
    }
}
