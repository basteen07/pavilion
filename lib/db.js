import { Pool } from 'pg';

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

export async function query(text, params) {
  const pool = getPool();
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function initializeDatabase() {
  const pool = getPool();

  try {
    console.log('Initializing database schema (37 tables)...');

    // ──────────────────────────────────────────────────────────────
    // 1. Core Identity & Access
    // ──────────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        permissions JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (role_id, permission_id)
      );

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        role VARCHAR(50),
        role_id UUID REFERENCES roles(id),
        full_name VARCHAR(255),
        mfa_enabled BOOLEAN DEFAULT false,
        mfa_secret VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP,
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ──────────────────────────────────────────────────────────────
    // 2. Content Management
    // ──────────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cms_pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        content TEXT,
        is_published BOOLEAN DEFAULT true,
        content_blocks JSONB DEFAULT '[]',
        image_url TEXT,
        template VARCHAR(100) DEFAULT 'default',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS banners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255),
        desktop_image_url TEXT NOT NULL,
        mobile_image_url TEXT,
        link TEXT,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS homepage_banners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255),
        image_url VARCHAR(500),
        cta_text VARCHAR(100),
        cta_link VARCHAR(500),
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS blog_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        excerpt TEXT,
        content TEXT,
        featured_image VARCHAR(500),
        author_id UUID REFERENCES users(id),
        is_published BOOLEAN DEFAULT false,
        published_at TIMESTAMP,
        meta_title VARCHAR(255),
        meta_description TEXT,
        image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        tags JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS testimonials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_name VARCHAR(255) NOT NULL,
        customer_photo VARCHAR(500),
        profession VARCHAR(255),
        rating INT,
        testimonial TEXT NOT NULL,
        is_featured BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS site_settings (
        id SERIAL PRIMARY KEY,
        meta_title TEXT,
        meta_description TEXT,
        head_scripts TEXT,
        body_scripts TEXT,
        google_analytics_id TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        type VARCHAR(50) DEFAULT 'string',
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ──────────────────────────────────────────────────────────────
    // 3. Product Catalog Hierarchy
    // ──────────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS parent_collections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        image_desktop JSONB,
        image_mobile JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        parent_id UUID REFERENCES categories(id),
        parent_collection_id UUID REFERENCES parent_collections(id) ON DELETE SET NULL,
        image_url JSONB,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sub_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
        image_url JSONB,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS brands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        logo_url TEXT,
        description TEXT,
        image_url TEXT,
        category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
        sub_category_id INT REFERENCES sub_categories(id) ON DELETE CASCADE,
        is_featured BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS product_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        category_id UUID REFERENCES categories(id),
        sub_category_id INT REFERENCES sub_categories(id),
        brand_ids JSONB DEFAULT '[]',
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ──────────────────────────────────────────────────────────────
    // 4. Products & Variants
    // ──────────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sku VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        handle TEXT,
        short_description TEXT,
        description TEXT,
        a_plus_content TEXT,
        category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
        sub_category_id INT REFERENCES sub_categories(id) ON DELETE CASCADE,
        brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
        tag_id UUID REFERENCES product_tags(id),
        mrp_price NUMERIC(10,2) NOT NULL,
        shop_price NUMERIC(10,2) NOT NULL DEFAULT 0,
        dealer_price NUMERIC(10,2),
        counter_price NUMERIC DEFAULT 0,
        recommended_price NUMERIC DEFAULT 0,
        discount_percentage NUMERIC(5,2) DEFAULT 0,
        size VARCHAR(100),
        color TEXT,
        option1_name TEXT,
        option1_value TEXT,
        option2_name TEXT,
        option2_value TEXT,
        option3_name TEXT,
        option3_value TEXT,
        option4_name TEXT,
        option4_value TEXT,
        stock_quantity INT DEFAULT 0,
        images JSONB DEFAULT '[]',
        videos JSONB DEFAULT '[]',
        variants JSONB DEFAULT '[]',
        unit TEXT,
        unit_type VARCHAR(50) DEFAULT 'single',
        tax_class TEXT,
        hsn_code TEXT,
        gst_percentage NUMERIC(5,2) DEFAULT 18,
        buy_url TEXT,
        is_featured BOOLEAN DEFAULT false,
        allow_quote BOOLEAN DEFAULT true,
        is_quote_hidden BOOLEAN DEFAULT false,
        is_discontinued BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        price_updated_at TIMESTAMP,
        mrp_updated_at TIMESTAMPTZ,
        dealer_price_updated_at TIMESTAMPTZ,
        counter_price_updated_at TIMESTAMPTZ,
        recommended_price_updated_at TIMESTAMPTZ,
        shop_price_updated_at TIMESTAMPTZ,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        sku TEXT UNIQUE NOT NULL,
        size TEXT,
        color TEXT,
        option1_name TEXT,
        option1_value TEXT,
        option2_name TEXT,
        option2_value TEXT,
        option3_name TEXT,
        option3_value TEXT,
        option4_name TEXT,
        option4_value TEXT,
        mrp_price NUMERIC NOT NULL DEFAULT 0,
        dealer_price NUMERIC DEFAULT 0,
        counter_price NUMERIC DEFAULT 0,
        recommended_price NUMERIC DEFAULT 0,
        shop_price NUMERIC DEFAULT 0,
        inventory INT DEFAULT 0,
        images JSONB DEFAULT '[]',
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        price_updated_at TIMESTAMPTZ,
        mrp_updated_at TIMESTAMPTZ,
        dealer_price_updated_at TIMESTAMPTZ,
        counter_price_updated_at TIMESTAMPTZ,
        recommended_price_updated_at TIMESTAMPTZ,
        shop_price_updated_at TIMESTAMPTZ,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS product_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        alt_text VARCHAR(255),
        display_order INT DEFAULT 0,
        is_primary BOOLEAN DEFAULT false
      );
    `);

    // ──────────────────────────────────────────────────────────────
    // 5. Customers
    // ──────────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_types (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        discount_percentage NUMERIC DEFAULT 0,
        base_price_type TEXT DEFAULT 'mrp',
        percentage NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        company_name VARCHAR(255) NOT NULL,
        name TEXT,
        contact_person VARCHAR(255),
        phone VARCHAR(50),
        gstin VARCHAR(50),
        gst_number VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(20),
        customer_type VARCHAR(50) DEFAULT 'general',
        customer_type_id INT REFERENCES customer_types(id),
        entity_type VARCHAR(20) DEFAULT 'individual',
        display_name_type VARCHAR(20) DEFAULT 'company',
        type VARCHAR(50) DEFAULT 'General',
        discount_percentage NUMERIC(5,2) DEFAULT 0,
        primary_contact_name VARCHAR(255),
        primary_contact_email VARCHAR(255),
        primary_contact_phone VARCHAR(50),
        contacts JSONB DEFAULT '[]',
        is_approved BOOLEAN DEFAULT false,
        mfa_enabled BOOLEAN DEFAULT false,
        mfa_secret VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customer_addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id),
        address_type VARCHAR(50) DEFAULT 'Billing',
        address_line1 VARCHAR(255) NOT NULL,
        address_line2 VARCHAR(255),
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        pincode VARCHAR(10) NOT NULL,
        country VARCHAR(100) DEFAULT 'India',
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS b2b_customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        gstin VARCHAR(50),
        business_type VARCHAR(100),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        status VARCHAR(50) DEFAULT 'pending',
        approved_by UUID REFERENCES users(id),
        approved_at TIMESTAMP,
        discount_percentage NUMERIC(5,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        first_name TEXT,
        last_name TEXT,
        pan_number TEXT,
        address_line2 TEXT,
        terms_and_conditions TEXT,
        admin_comments TEXT,
        approval_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS b2b_customer_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES b2b_customers(id) ON DELETE CASCADE,
        admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
        event_type TEXT NOT NULL,
        description TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ──────────────────────────────────────────────────────────────
    // 6. Quotations
    // ──────────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quotations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quotation_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id UUID REFERENCES customers(id),
        created_by UUID REFERENCES users(id),
        total_amount NUMERIC(10,2) DEFAULT 0,
        subtotal NUMERIC(15,2) DEFAULT 0,
        tax NUMERIC(15,2) DEFAULT 0,
        tax_rate NUMERIC(5,2) DEFAULT 18,
        shipping_cost NUMERIC(10,2) DEFAULT 0,
        discount_type VARCHAR(20) DEFAULT 'percentage',
        discount_value NUMERIC(10,2) DEFAULT 0,
        show_total BOOLEAN DEFAULT true,
        status VARCHAR(50) DEFAULT 'draft',
        notes TEXT,
        terms_conditions TEXT,
        customer_snapshot JSONB,
        reference_number VARCHAR(50),
        valid_until DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS quotation_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        product_name VARCHAR(255) NOT NULL,
        slug TEXT,
        quantity INT NOT NULL,
        unit_price NUMERIC(10,2) NOT NULL,
        line_total NUMERIC(10,2) NOT NULL,
        total_price NUMERIC(15,2) DEFAULT 0,
        mrp NUMERIC(15,2) DEFAULT 0,
        dealer_price NUMERIC(15,2) DEFAULT 0,
        recommended_price NUMERIC DEFAULT 0,
        discount NUMERIC(5,2) DEFAULT 0,
        is_detailed BOOLEAN DEFAULT false,
        short_description TEXT,
        image_url TEXT,
        uom TEXT DEFAULT 'Single'
      );
    `);

    // ──────────────────────────────────────────────────────────────
    // 7. Orders
    // ──────────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id UUID REFERENCES b2b_customers(id),
        total NUMERIC(10,2) DEFAULT 0,
        subtotal NUMERIC(10,2) DEFAULT 0,
        discount NUMERIC(10,2) DEFAULT 0,
        tax NUMERIC(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'open',
        notes TEXT,
        products JSONB DEFAULT '[]',
        fulfillment JSONB DEFAULT '[]',
        edited_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        product_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        unit_price NUMERIC(10,2) NOT NULL,
        discount_percentage NUMERIC(5,2) DEFAULT 0,
        line_total NUMERIC(10,2) NOT NULL,
        quantity_fulfilled INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS order_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        customer_id UUID REFERENCES customers(id),
        comment TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ──────────────────────────────────────────────────────────────
    // 8. Careers & Applications
    // ──────────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS careers_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        type VARCHAR(100),
        description TEXT,
        requirements TEXT,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS job_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID REFERENCES careers_jobs(id) ON DELETE CASCADE,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        linkedin_url TEXT,
        portfolio_url TEXT,
        cover_letter TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        department VARCHAR(100),
        location VARCHAR(100),
        employment_type VARCHAR(50),
        description TEXT,
        requirements TEXT,
        salary_range VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS job_listings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        department VARCHAR(100),
        location VARCHAR(255),
        employment_type VARCHAR(50),
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ──────────────────────────────────────────────────────────────
    // 9. Gallery
    // ──────────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gallery_albums (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255),
        description TEXT,
        cover_image JSONB,
        type VARCHAR(50) DEFAULT 'photo',
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS gallery_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        album_id UUID REFERENCES gallery_albums(id) ON DELETE CASCADE,
        type VARCHAR(50) DEFAULT 'image',
        url JSONB,
        thumbnail_url JSONB,
        caption TEXT,
        width INT,
        height INT,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ──────────────────────────────────────────────────────────────
    // 10. System & Logs
    // ──────────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID REFERENCES users(id),
        customer_id UUID REFERENCES customers(id),
        quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ──────────────────────────────────────────────────────────────
    // 11. Schema Patches (safely add columns to legacy tables)
    // ──────────────────────────────────────────────────────────────
    await pool.query(`
      DO $$
      BEGIN
        -- Users patches
        BEGIN ALTER TABLE users ADD COLUMN full_name VARCHAR(255); EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE users ADD COLUMN phone VARCHAR(50); EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE users ADD COLUMN role VARCHAR(50); EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE users ADD COLUMN last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255); EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE users ADD COLUMN reset_token VARCHAR(255); EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE users ADD COLUMN reset_token_expiry TIMESTAMP; EXCEPTION WHEN duplicate_column THEN END;

        -- Categories patches
        BEGIN ALTER TABLE categories ADD COLUMN description TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE categories ADD COLUMN parent_collection_id UUID; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE categories ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP; EXCEPTION WHEN duplicate_column THEN END;

        -- Brands patches
        BEGIN ALTER TABLE brands ADD COLUMN category_id UUID; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE brands ADD COLUMN sub_category_id INT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE brands ADD COLUMN is_featured BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE brands ADD COLUMN description TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE brands ADD COLUMN image_url TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE brands ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP; EXCEPTION WHEN duplicate_column THEN END;

        -- Products patches
        BEGIN ALTER TABLE products ADD COLUMN sub_category_id INT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE products ADD COLUMN tag_id UUID; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE products ADD COLUMN handle TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE products ADD COLUMN variants JSONB DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE products ADD COLUMN dealer_price NUMERIC(10,2); EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE products ADD COLUMN counter_price NUMERIC DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE products ADD COLUMN recommended_price NUMERIC DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE products ADD COLUMN is_discontinued BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE products ADD COLUMN is_quote_hidden BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE products ADD COLUMN buy_url TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE products ADD COLUMN tax_class TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE products ADD COLUMN hsn_code TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE products ADD COLUMN unit TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE products ADD COLUMN unit_type VARCHAR(50) DEFAULT 'single'; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE products ADD COLUMN gst_percentage NUMERIC(5,2) DEFAULT 18; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE products ADD COLUMN a_plus_content TEXT; EXCEPTION WHEN duplicate_column THEN END;

        -- Product variants patches
        BEGIN ALTER TABLE product_variants ADD COLUMN images JSONB DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE product_variants ADD COLUMN price_updated_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE product_variants ADD COLUMN option4_name TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE product_variants ADD COLUMN option4_value TEXT; EXCEPTION WHEN duplicate_column THEN END;

        -- B2B customers patches
        BEGIN ALTER TABLE b2b_customers ADD COLUMN is_active BOOLEAN DEFAULT true; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE b2b_customers ADD COLUMN first_name TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE b2b_customers ADD COLUMN last_name TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE b2b_customers ADD COLUMN pan_number TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE b2b_customers ADD COLUMN address_line2 TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE b2b_customers ADD COLUMN terms_and_conditions TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE b2b_customers ADD COLUMN admin_comments TEXT; EXCEPTION WHEN duplicate_column THEN END;

        -- Orders patches
        BEGIN ALTER TABLE orders ADD COLUMN edited_by TEXT; EXCEPTION WHEN duplicate_column THEN END;

        -- Customers patches
        BEGIN ALTER TABLE customers ADD COLUMN contacts JSONB DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE customers ADD COLUMN name TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE customers ADD COLUMN customer_type_id INT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE customers ADD COLUMN entity_type VARCHAR(20) DEFAULT 'individual'; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE customers ADD COLUMN display_name_type VARCHAR(20) DEFAULT 'company'; EXCEPTION WHEN duplicate_column THEN END;

        -- Sub categories patches
        BEGIN ALTER TABLE sub_categories ADD COLUMN display_order INT DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END;

        -- Blog posts patches
        BEGIN ALTER TABLE blog_posts ADD COLUMN image_url TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE blog_posts ADD COLUMN is_active BOOLEAN DEFAULT true; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE blog_posts ADD COLUMN tags JSONB DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN END;

        -- CMS pages patches
        BEGIN ALTER TABLE cms_pages ADD COLUMN content_blocks JSONB DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE cms_pages ADD COLUMN image_url TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE cms_pages ADD COLUMN template VARCHAR(100) DEFAULT 'default'; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE cms_pages ADD COLUMN is_active BOOLEAN DEFAULT true; EXCEPTION WHEN duplicate_column THEN END;

        -- Testimonials patches
        BEGIN ALTER TABLE testimonials ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP; EXCEPTION WHEN duplicate_column THEN END;

        -- Quotations patches
        BEGIN ALTER TABLE quotations ADD COLUMN customer_snapshot JSONB; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE quotations ADD COLUMN reference_number VARCHAR(50); EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE quotations ADD COLUMN subtotal NUMERIC(15,2) DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE quotations ADD COLUMN tax NUMERIC(15,2) DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE quotations ADD COLUMN terms_conditions TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE quotations ADD COLUMN valid_until DATE; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE quotations ADD COLUMN shipping_cost NUMERIC(10,2) DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE quotations ADD COLUMN discount_type VARCHAR(20) DEFAULT 'percentage'; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE quotations ADD COLUMN discount_value NUMERIC(10,2) DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE quotations ADD COLUMN tax_rate NUMERIC(5,2) DEFAULT 18; EXCEPTION WHEN duplicate_column THEN END;

        -- Quotation items patches
        BEGIN ALTER TABLE quotation_items ADD COLUMN slug TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE quotation_items ADD COLUMN dealer_price NUMERIC(15,2) DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE quotation_items ADD COLUMN is_detailed BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE quotation_items ADD COLUMN short_description TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE quotation_items ADD COLUMN image_url TEXT; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE quotation_items ADD COLUMN uom TEXT DEFAULT 'Single'; EXCEPTION WHEN duplicate_column THEN END;
        BEGIN ALTER TABLE quotation_items ADD COLUMN recommended_price NUMERIC DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END;
      END $$;
    `);

    // ──────────────────────────────────────────────────────────────
    // 12. Indexes
    // ──────────────────────────────────────────────────────────────
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
      CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
      CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
      CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
      CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
      CREATE INDEX IF NOT EXISTS idx_sub_categories_category ON sub_categories(category_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
      CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_event ON activity_logs(event_type);
      CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    `);

    console.log('Database schema initialized successfully (37 tables)');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

