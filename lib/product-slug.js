import { query, withTransaction } from '@/lib/simple-db';

// Product URL slug = the product name with spaces replaced by hyphens (letters and case are kept).
// Only characters that would break a URL path (/ \ ? # %) are dropped.
// "RNS Prolite Batting Gloves Men" -> "RNS-Prolite-Batting-Gloves-Men"
export function productSlugFromName(name) {
    return String(name || '')
        .replace(/[/\\?#%]+/g, ' ')
        .trim()
        .replace(/\s+/g, '-') || 'product';
}

// True when slug is exactly the name's slug (same capitals), or it with a "-2"/"-3"... suffix
// added for a duplicate name. Uniqueness checks elsewhere ignore case.
const fitsName = (slug, base) => {
    const s = String(slug || '');
    return s === base || (s.startsWith(`${base}-`) && /^\d+$/.test(s.slice(base.length + 1)));
};

// usedLower: Set of lowercase slugs already taken; the chosen slug is added to it
export function pickUniqueSlug(base, usedLower) {
    let slug = base;
    for (let n = 2; usedLower.has(slug.toLowerCase()); n++) slug = `${base}-${n}`;
    usedLower.add(slug.toLowerCase());
    return slug;
}

async function takenSlugs(db, base, excludeId = null) {
    const result = await db.query(`
        SELECT slug FROM products
        WHERE ($2::uuid IS NULL OR id <> $2)
          AND (lower(slug) = lower($1) OR lower(slug) LIKE lower($1) || '-%')
    `, [base, excludeId]);
    return new Set(result.rows.map(r => r.slug.toLowerCase()));
}

// Slug for a product that is about to be created
export async function newProductSlug(name, db = { query }) {
    const base = productSlugFromName(name);
    return pickUniqueSlug(base, await takenSlugs(db, base));
}

// After a product's name is set/changed: give it the name's slug (unless it already has it).
// The previous slug is kept in old_slugs so existing links keep working.
export async function syncProductSlug(id, name, db = { query }) {
    const base = productSlugFromName(name);
    const current = (await db.query('SELECT slug FROM products WHERE id = $1', [id])).rows[0];
    if (!current) return null;
    if (fitsName(current.slug, base)) return current.slug;
    const slug = pickUniqueSlug(base, await takenSlugs(db, base, id));
    await db.query(`
        UPDATE products SET
            old_slugs = CASE WHEN slug IS NULL OR slug = ANY(old_slugs) THEN old_slugs ELSE array_append(old_slugs, slug) END,
            slug = $2
        WHERE id = $1
    `, [id, slug]);
    return slug;
}

let setupDone = false;
export async function ensureProductSlugColumns() {
    if (setupDone) return;
    await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS old_slugs TEXT[] NOT NULL DEFAULT '{}'`);
    await query(`CREATE INDEX IF NOT EXISTS idx_products_old_slugs ON products USING GIN (old_slugs)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_products_slug_lower ON products (lower(slug))`);
    setupDone = true;
}

// One-time conversion of existing products (safe to run repeatedly: only products whose slug
// does not come from their name are changed). Older products keep the plain name slug on duplicates.
export async function convertAllProductSlugs() {
    await ensureProductSlugColumns();
    const { rows } = await query('SELECT id, name, slug FROM products ORDER BY created_at NULLS LAST, id');

    const used = new Set();
    const pending = [];
    for (const row of rows) {
        const base = productSlugFromName(row.name);
        if (fitsName(row.slug, base) && !used.has(row.slug.toLowerCase())) used.add(row.slug.toLowerCase());
        else pending.push({ id: row.id, base });
    }
    if (pending.length === 0) return 0;

    const changes = pending.map(p => ({ id: p.id, slug: pickUniqueSlug(p.base, used) }));
    await withTransaction(async (client) => {
        // Step 1 parks the old slugs (kept in old_slugs) so step 2 can't collide with a slug about to be freed
        await client.query(`
            UPDATE products p SET
                old_slugs = CASE WHEN p.slug IS NULL OR p.slug = ANY(p.old_slugs) THEN p.old_slugs ELSE array_append(p.old_slugs, p.slug) END,
                slug = '__renaming__' || p.id
            FROM jsonb_to_recordset($1::jsonb) AS c(id uuid, slug text)
            WHERE p.id = c.id
        `, [JSON.stringify(changes)]);
        await client.query(`
            UPDATE products p SET slug = c.slug
            FROM jsonb_to_recordset($1::jsonb) AS c(id uuid, slug text)
            WHERE p.id = c.id
        `, [JSON.stringify(changes)]);
    });
    return changes.length;
}
