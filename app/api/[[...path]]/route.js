import { NextResponse } from 'next/server';
import { query } from '@/lib/simple-db';
import { hashPassword, verifyPassword, createToken, verifyToken, generateMFASecret, generateQRCode, verifyTOTP } from '@/lib/auth';
import { sendEmail, sendQuotationEmail, sendOrderConfirmationEmail, sendB2BApprovalEmail } from '@/lib/email';

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

// Auth middleware
async function authenticateRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Auth Debug: No/Invalid Auth Header', authHeader);
    return null;
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token);

  if (!payload || !payload.userId) {
    console.log('Auth Debug: Invalid Token or No UserID in Payload', payload);
    return null;
  }

  const result = await query(
    `SELECT u.*, r.name as role_name 
     FROM users u 
     LEFT JOIN roles r ON u.role_id = r.id 
     WHERE u.id = $1 AND u.is_active = true`,
    [payload.userId]
  );

  if (result.rows.length === 0) {
    console.log('Auth Debug: User not found or inactive', payload.userId);
    return null;
  }

  const user = result.rows[0];

  // Fetch Permissions
  const permissionsResult = await query(`
      SELECT p.name 
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
  `, [user.role_id]);

  user.permissions = permissionsResult.rows.map(row => row.name);

  // Session Timeout Logic
  // Super Admin: No timeout
  if (user.role_name === 'superadmin') {
    // No timeout check for superadmin
  } else if (user.role_name === 'admin') {
    // Other Admins: 7 minutes timeout (or whatever was intended)
    // Actually, let's stick to the 120min from the current file but add the bypass
    const TIMEOUT_MS = 120 * 60 * 1000;
    if (user.last_active_at) {
      const lastActive = new Date(user.last_active_at).getTime();
      const now = Date.now();
      const diff = now - lastActive;

      if (diff > TIMEOUT_MS) {
        console.log('Session expired for:', user.email, 'Age:', Math.round(diff / 60000), 'min');
        return null; // Force 401
      }
    }
  } else if (user.role_name === 'b2b_user') {
    // B2B Users: No timeout (as per user request)
  } else {
    // Default for Other roles: 2 hours
    const TIMEOUT_MS = 120 * 60 * 1000;
    if (user.last_active_at) {
      const lastActive = new Date(user.last_active_at).getTime();
      const now = Date.now();
      const diff = now - lastActive;

      if (diff > TIMEOUT_MS) {
        console.log('Session expired for:', user.email, 'Age:', Math.round(diff / 60000), 'min');
        return null; // Force 401
      }
    }
  }

  // Update last_active_at
  try {
    await query('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
  } catch (err) {
    console.error('Failed to update last_active_at:', err.message);
  }

  return user;
}

// Main route handler
async function handleRoute(request, { params }) {
  const { path = [] } = params;
  const route = `/${path.join('/')}`;
  const method = request.method;

  try {
    console.log('API Route called:', { route, method, path });

    // ============ PUBLIC ENDPOINTS ============

    // ============ PUBLIC ENDPOINTS ============

    // Get collections
    if (route === '/collections' || route === '/parent-collections') {
      if (method === 'GET') {
        const url = new URL(request.url);
        return import('@/lib/api/collections').then(m => m.getCollections(url.searchParams));
      }
      if (method === 'POST') return import('@/lib/api/collections').then(async m => m.createCollection(await request.json()));
    }

    if (route.startsWith('/collections/') && method === 'PUT') {
      const id = path[1];
      return import('@/lib/api/collections').then(async m => m.updateCollection(id, await request.json()));
    }

    if (route.startsWith('/collections/') && method === 'DELETE') {
      const id = path[1];
      return import('@/lib/api/collections').then(m => m.deleteCollection(id));
    }

    // Get categories
    if (route === '/categories') {
      if (method === 'GET') return import('@/lib/api/categories').then(m => m.getCategories());
      if (method === 'POST') return import('@/lib/api/categories').then(async m => m.createCategory(await request.json()));
    }

    if (route.startsWith('/categories/') && method === 'PUT') {
      const id = path[1];
      return import('@/lib/api/categories').then(async m => m.updateCategory(id, await request.json()));
    }

    if (route.startsWith('/categories/') && method === 'DELETE') {
      const id = path[1];
      return import('@/lib/api/categories').then(m => m.deleteCategory(id));
    }

    // Get sub-categories
    if (route === '/sub-categories') {
      const url = new URL(request.url);
      const categoryId = url.searchParams.get('categoryId');
      if (method === 'GET') return import('@/lib/api/categories').then(m => m.getSubCategories(categoryId));
      if (method === 'POST') return import('@/lib/api/categories').then(async m => m.createSubCategory(await request.json()));
    }

    if (route.startsWith('/sub-categories/') && method === 'PUT') {
      const id = path[1];
      return import('@/lib/api/categories').then(async m => m.updateSubCategory(id, await request.json()));
    }

    if (route.startsWith('/sub-categories/') && method === 'DELETE') {
      const id = path[1];
      return import('@/lib/api/categories').then(m => m.deleteSubCategory(id));
    }

    // Get tags
    if (route === '/tags') {
      const url = new URL(request.url);
      const subCategoryId = url.searchParams.get('subCategoryId');
      if (method === 'GET') return import('@/lib/api/categories').then(m => m.getTags(subCategoryId));
      if (method === 'POST') return import('@/lib/api/categories').then(async m => m.createTag(await request.json()));
    }

    if (route.startsWith('/tags/') && method === 'PUT') {
      const id = path[1];
      return import('@/lib/api/categories').then(async m => m.updateTag(id, await request.json()));
    }

    if (route.startsWith('/tags/') && method === 'DELETE') {
      const id = path[1];
      return import('@/lib/api/categories').then(m => m.deleteTag(id));
    }

    // Get brands
    if (route === '/brands') {
      if (method === 'GET') {
        const url = new URL(request.url);
        return import('@/lib/api/brands').then(m => m.getBrands(url.searchParams));
      }
      if (method === 'POST') return import('@/lib/api/brands').then(async m => m.createBrand(await request.json()));
    }

    if (route.startsWith('/brands/') && method === 'PUT') {
      const id = path[1];
      return import('@/lib/api/brands').then(async m => m.updateBrand(id, await request.json()));
    }

    if (route.startsWith('/brands/') && method === 'DELETE') {
      const id = path[1];
      return import('@/lib/api/brands').then(m => m.deleteBrand(id));
    }

    // Get products (with filters)
    if (route === '/products') {
      if (method === 'GET') {
        const url = new URL(request.url);
        return import('@/lib/api/products').then(m => m.getProducts(url.searchParams));
      }
      if (method === 'POST') {
        return import('@/lib/api/products').then(async m => m.createProduct(await request.json()));
      }
    }

    if (route === '/products/bulk' && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }
      return import('@/lib/api/products').then(async m => m.bulkUploadProducts(await request.json()));
    }

    // --- NEW: Banners API ---
    if (route === '/banners') {
      if (method === 'GET') {
        const url = new URL(request.url);
        return import('@/lib/api/banners').then(m => m.getBanners(url.searchParams));
      }
      if (method === 'POST') return import('@/lib/api/banners').then(async m => m.createBanner(await request.json()));
    }

    if (route.startsWith('/banners/') && method === 'PUT') {
      const id = path[1];
      return import('@/lib/api/banners').then(async m => m.updateBanner(id, await request.json()));
    }

    if (route.startsWith('/banners/') && method === 'DELETE') {
      const id = path[1];
      return import('@/lib/api/banners').then(m => m.deleteBanner(id));
    }

    // --- NEW: Blogs API ---
    if (route === '/blogs') {
      if (method === 'GET') {
        const url = new URL(request.url);
        return import('@/lib/api/blogs').then(m => m.getBlogs(url.searchParams));
      }
      if (method === 'POST') return import('@/lib/api/blogs').then(async m => m.createBlog(await request.json()));
    }

    // Get blog by slug (public) or ID (admin) logic might overlap. 
    // Usually public uses slug. Let's assume /blogs/[slug] is public GET, and /blogs/[id] is admin PUT/DELETE.
    // However, clean REST might use /blogs/slug/[slug].
    // Let's stick to /blogs/[param] where we check if it's a UUID or Slug.
    // Actually, `getBlogBySlug` is what we want for public.

    if (route.startsWith('/blogs/slug/')) {
      const slug = path[2]; // /blogs/slug/my-blog
      if (method === 'GET') {
        return import('@/lib/api/blogs').then(m => m.getBlogBySlug(slug));
      }
    }

    if (route.startsWith('/blogs/') && method === 'PUT') {
      const id = path[1];
      return import('@/lib/api/blogs').then(async m => m.updateBlog(id, await request.json()));
    }

    if (route.startsWith('/blogs/') && method === 'DELETE') {
      const id = path[1];
      return import('@/lib/api/blogs').then(m => m.deleteBlog(id));
    }

    // --- NEW: CMS Pages API ---
    if (route === '/cms-pages') {
      if (method === 'GET') return import('@/lib/api/cms-pages').then(m => m.getCMSPages());
      if (method === 'POST') return import('@/lib/api/cms-pages').then(async m => m.createCMSPage(await request.json()));
    }

    if (route.startsWith('/cms-pages/slug/')) {
      const slug = path.slice(2).join('/');
      if (method === 'GET') {
        return import('@/lib/api/cms-pages').then(m => m.getCMSPageBySlug(slug));
      }
    }

    if (route.startsWith('/cms-pages/') && method === 'PUT') {
      const id = path[1];
      return import('@/lib/api/cms-pages').then(async m => m.updateCMSPage(id, await request.json()));
    }

    if (route.startsWith('/cms-pages/') && method === 'DELETE') {
      const id = path[1];
      return import('@/lib/api/cms-pages').then(m => m.deleteCMSPage(id));
    }

    // --- NEW: Customers API ---
    if (route === '/customers') {
      if (method === 'GET') {
        const url = new URL(request.url);
        return import('@/lib/api/customers').then(m => m.getCustomers(url.searchParams));
      }
      if (method === 'POST') {
        return import('@/lib/api/customers').then(async m => m.createCustomer(await request.json()));
      }
    }

    if (route.startsWith('/customers/')) {
      const id = path[1];
      if (method === 'GET') return import('@/lib/api/customers').then(m => m.getCustomerById(id));
      if (method === 'PUT') return import('@/lib/api/customers').then(async m => m.updateCustomer(id, await request.json()));
      if (method === 'DELETE') return import('@/lib/api/customers').then(m => m.deleteCustomer(id));
    }

    // --- NEW: Customer Types API ---
    if (route === '/customer-types') {
      if (method === 'GET') return import('@/lib/api/customer-types').then(m => m.getCustomerTypes());
      if (method === 'POST') return import('@/lib/api/customer-types').then(async m => m.createCustomerType(await request.json()));
    }

    if (route.startsWith('/customer-types/') && method === 'PUT') {
      const id = path[1];
      return import('@/lib/api/customer-types').then(async m => m.updateCustomerType(id, await request.json()));
    }

    if (route.startsWith('/customer-types/') && method === 'DELETE') {
      const id = path[1];
      return import('@/lib/api/customer-types').then(m => m.deleteCustomerType(id));
    }

    // --- NEW: Quotations API ---
    if (route === '/quotations') {
      if (method === 'GET') {
        const url = new URL(request.url);
        return import('@/lib/api/quotations').then(m => m.getQuotations(url.searchParams));
      }
      if (method === 'POST') {
        return import('@/lib/api/quotations').then(async m => m.createQuotation(await request.json()));
      }
    }

    if (route.startsWith('/quotations/')) {
      const id = path[1];
      if (method === 'GET') return import('@/lib/api/quotations').then(m => m.getQuotationById(id));
      if (method === 'PUT') return import('@/lib/api/quotations').then(async m => m.updateQuotation(id, await request.json()));
      if (method === 'DELETE') return import('@/lib/api/quotations').then(m => m.deleteQuotation(id));
    }

    // Get/Update/Delete single product
    if (route.startsWith('/products/')) {
      const param = path[1];
      // Check if it's an ID (numeric) or slug (string)
      // Usually slug for GET public, ID for admin operations.
      // But here we use slug for public GET.

      if (method === 'GET') {
        return import('@/lib/api/products').then(m => m.getProductBySlug(param));
      }

      // For PUT/DELETE we assume ID is passed in route for admin actions, 
      // but if the route logic uses slug, we might need adjustment.
      // The current frontend might use ID. Let's assume ID for mutation.
      if (method === 'PUT') {
        return import('@/lib/api/products').then(async m => m.updateProduct(param, await request.json()));
      }
      if (method === 'DELETE') {
        return import('@/lib/api/products').then(m => m.deleteProduct(param));
      }
    }

    // ============ AUTH ENDPOINTS ============

    // Login (direct route for frontend compatibility)
    if (route === '/login' && method === 'POST') {
      const body = await request.json();
      const { email, password, mfa_code } = body;

      if (!email || !password) {
        return handleCORS(NextResponse.json({ error: 'Email and password required' }, { status: 400 }));
      }

      const result = await query(
        `SELECT u.*, r.name as role_name 
         FROM users u 
         LEFT JOIN roles r ON u.role_id = r.id 
         WHERE u.email = $1 AND u.is_active = true`,
        [email]
      );

      if (result.rows.length === 0) {
        return handleCORS(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }));
      }

      const user = result.rows[0];
      const validPassword = await verifyPassword(password, user.password_hash);

      if (!validPassword) {
        return handleCORS(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }));
      }

      // Check MFA
      if (user.mfa_enabled && user.mfa_secret) {
        if (!mfa_code) {
          return handleCORS(NextResponse.json({
            mfa_required: true,
            message: 'MFA code required'
          }));
        }

        const validMFA = verifyTOTP(user.mfa_secret, mfa_code);
        if (!validMFA) {
          return handleCORS(NextResponse.json({ error: 'Invalid MFA code' }, { status: 401 }));
        }
      }

      const token = await createToken({ userId: user.id, email: user.email, role: user.role_name });

      return handleCORS(NextResponse.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role_name,
          mfa_enabled: user.mfa_enabled
        }
      }));
    }

    // Register
    if ((route === '/auth/register' || route === '/register') && method === 'POST') {
      const body = await request.json();
      const { email, password, name, full_name, phone } = body;
      const userName = name || full_name;

      if (!email || !password) {
        return handleCORS(NextResponse.json({ error: 'Email and password required' }, { status: 400 }));
      }

      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return handleCORS(NextResponse.json({ error: 'Email already registered' }, { status: 400 }));
      }

      const roleResult = await query("SELECT id FROM roles WHERE name = 'normal_user'");
      const roleId = roleResult.rows[0]?.id;

      const passwordHash = await hashPassword(password);
      const result = await query(
        `INSERT INTO users (email, password_hash, name, phone, role_id, mfa_enabled, is_active) 
         VALUES ($1, $2, $3, $4, $5, false, true) 
         RETURNING id, email, name, phone`,
        [email, passwordHash, userName || 'User', phone || null, roleId]
      );

      return handleCORS(NextResponse.json({
        success: true,
        user: result.rows[0],
        message: 'Registration successful. Please login.'
      }));
    }

    // Login
    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json();
      const { email, password, mfa_code } = body;

      if (!email || !password) {
        return handleCORS(NextResponse.json({ error: 'Email and password required' }, { status: 400 }));
      }

      const result = await query(
        `SELECT u.*, r.name as role_name 
         FROM users u 
         LEFT JOIN roles r ON u.role_id = r.id 
         WHERE u.email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return handleCORS(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }));
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return handleCORS(NextResponse.json({
          error: 'Account pending approval',
          message: 'Your account is currently pending admin approval. You will receive an email once it is activated.'
        }, { status: 403 }));
      }

      const validPassword = await verifyPassword(password, user.password_hash);

      if (!validPassword) {
        return handleCORS(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }));
      }

      // Check MFA
      if (user.mfa_enabled && user.mfa_secret) {
        if (!mfa_code) {
          return handleCORS(NextResponse.json({
            mfa_required: true,
            message: 'MFA code required'
          }));
        }

        const validMFA = verifyTOTP(user.mfa_secret, mfa_code);
        if (!validMFA) {
          return handleCORS(NextResponse.json({ error: 'Invalid MFA code' }, { status: 401 }));
        }
      }

      const token = await createToken({ userId: user.id, email: user.email, role: user.role_name });

      return handleCORS(NextResponse.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role_name,
          mfa_enabled: user.mfa_enabled
        }
      }));
    }

    // Setup MFA
    if (route === '/auth/mfa/setup' && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const secret = generateMFASecret();
      const qrCode = await generateQRCode(secret, user.email);

      await query('UPDATE users SET mfa_secret = $1 WHERE id = $2', [secret, user.id]);

      return handleCORS(NextResponse.json({ secret, qrCode }));
    }

    // Verify and enable MFA
    if (route === '/auth/mfa/verify' && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const body = await request.json();
      const { code } = body;

      if (!code) {
        return handleCORS(NextResponse.json({ error: 'Code required' }, { status: 400 }));
      }

      const valid = verifyTOTP(user.mfa_secret, code);
      if (!valid) {
        return handleCORS(NextResponse.json({ error: 'Invalid code' }, { status: 400 }));
      }

      await query('UPDATE users SET mfa_enabled = true WHERE id = $1', [user.id]);

      return handleCORS(NextResponse.json({ success: true, message: 'MFA enabled successfully' }));
    }

    // Get current user
    if (route === '/auth/me' && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      return handleCORS(NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role_name,
        mfa_enabled: user.mfa_enabled
      }));
    }

    // ============ B2B CUSTOMER ENDPOINTS ============

    // Register B2B customer (combined user + B2B registration)
    if (route === '/b2b/register' && method === 'POST') {
      const body = await request.json();
      const { email, password, name, phone, company_name, gstin, business_type, address, city, state, pincode } = body;

      if (!email || !password || !company_name) {
        return handleCORS(NextResponse.json({ error: 'Email, password, and company name required' }, { status: 400 }));
      }

      // Check if user already exists
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return handleCORS(NextResponse.json({ error: 'Email already registered' }, { status: 400 }));
      }

      // Create user account
      const roleResult = await query("SELECT id FROM roles WHERE name = 'b2b_user'");
      const roleId = roleResult.rows[0]?.id;

      const passwordHash = await hashPassword(password);
      const userResult = await query(
        `INSERT INTO users (email, password_hash, name, phone, role_id, mfa_enabled, is_active) 
         VALUES ($1, $2, $3, $4, $5, false, false) 
         RETURNING id, email, name, phone`,
        [email, passwordHash, name || company_name || 'B2B User', phone || null, roleId]
      );

      const newUser = userResult.rows[0];

      // Create B2B customer record
      const b2bResult = await query(
        `INSERT INTO b2b_customers 
         (user_id, company_name, gstin, business_type, address, city, state, pincode, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') 
         RETURNING *`,
        [newUser.id, company_name, gstin || null, business_type || null, address || null, city || null, state || null, pincode || null]
      );

      await sendB2BApprovalEmail(email, 'pending');

      return handleCORS(NextResponse.json({
        success: true,
        user: newUser,
        customer: b2bResult.rows[0],
        message: 'B2B registration successful. Your account is pending approval.'
      }));
    }

    // Get B2B customer profile
    if (route === '/b2b/profile' && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const result = await query('SELECT * FROM b2b_customers WHERE user_id = $1', [user.id]);

      if (result.rows.length === 0) {
        return handleCORS(NextResponse.json({ error: 'B2B profile not found' }, { status: 404 }));
      }

      return handleCORS(NextResponse.json(result.rows[0]));
    }

    // Create order (B2B)
    if (route === '/b2b/orders' && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const customerResult = await query(
        'SELECT * FROM b2b_customers WHERE user_id = $1 AND status = $2',
        [user.id, 'approved']
      );

      if (customerResult.rows.length === 0) {
        return handleCORS(NextResponse.json({ error: 'B2B account not approved' }, { status: 403 }));
      }

      const customer = customerResult.rows[0];
      const body = await request.json();
      const { products, notes } = body;

      let subtotal = 0;
      products.forEach(item => {
        subtotal += parseFloat(item.price) * item.quantity;
      });

      const discount = (subtotal * (customer.discount_percentage || 0)) / 100;
      const total = subtotal - discount;
      const orderNumber = `ORD-${Date.now()}`;

      const orderResult = await query(
        `INSERT INTO orders 
         (order_number, customer_id, subtotal, discount, total, status) 
         VALUES ($1, $2, $3, $4, $5, 'pending') 
         RETURNING *`,
        [orderNumber, customer.id, subtotal, discount, total]
      );

      const orderId = orderResult.rows[0].id;

      for (const item of products) {
        await query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, item.product_id, item.name, item.quantity, item.price, item.price * item.quantity]
        );
      }

      await sendOrderConfirmationEmail(orderResult.rows[0], user.email);

      return handleCORS(NextResponse.json({ success: true, order: orderResult.rows[0] }));
    }

    // Get orders (B2B)
    if (route === '/b2b/orders' && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const customerResult = await query('SELECT id FROM b2b_customers WHERE user_id = $1', [user.id]);
      if (customerResult.rows.length === 0) {
        return handleCORS(NextResponse.json({ orders: [] }));
      }

      const result = await query(
        'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC',
        [customerResult.rows[0].id]
      );

      return handleCORS(NextResponse.json(result.rows));
    }

    // ============ ADMIN ENDPOINTS ============

    // Dashboard stats
    if (route === '/admin/dashboard' && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const products = await query('SELECT COUNT(*) FROM products WHERE is_active = true');
      const quotations = await query('SELECT COUNT(*) FROM quotations');
      const orders = await query('SELECT COUNT(*) FROM orders');
      const customers = await query('SELECT COUNT(*) FROM b2b_customers');
      const pending = await query('SELECT COUNT(*) FROM b2b_customers WHERE status = $1', ['pending']);

      return handleCORS(NextResponse.json({
        products: parseInt(products.rows[0].count),
        quotations: parseInt(quotations.rows[0].count),
        orders: parseInt(orders.rows[0].count),
        customers: parseInt(customers.rows[0].count),
        pending_approvals: parseInt(pending.rows[0].count)
      }));
    }
    // --- ADMIN USER MANAGEMENT (SUPERADMIN ONLY) ---

    // Get all users
    if (route === '/admin/users' && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || user.role_name !== 'superadmin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const result = await query(`
        SELECT u.id, u.email, u.name, u.phone, u.mfa_enabled, u.is_active, r.name as role 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        ORDER BY u.created_at DESC
      `);

      return handleCORS(NextResponse.json(result.rows));
    }

    // Create user
    if (route === '/admin/users' && method === 'POST') {
      const currentUser = await authenticateRequest(request);
      if (!currentUser || currentUser.role_name !== 'superadmin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const { email, password, name, phone, role_id } = await request.json();

      if (!email || !password || !role_id) {
        return handleCORS(NextResponse.json({ error: 'Email, password and role are required' }, { status: 400 }));
      }

      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return handleCORS(NextResponse.json({ error: 'User already exists' }, { status: 400 }));
      }

      const passwordHash = await hashPassword(password);
      const result = await query(`
        INSERT INTO users (email, password_hash, name, phone, role_id, is_active) 
        VALUES ($1, $2, $3, $4, $5, true) 
        RETURNING id, email, name, role_id
      `, [email, passwordHash, name || null, phone || null, role_id]);

      return handleCORS(NextResponse.json(result.rows[0]));
    }

    // Delete user
    if (route.startsWith('/admin/users/') && method === 'DELETE') {
      const currentUser = await authenticateRequest(request);
      if (!currentUser || currentUser.role_name !== 'superadmin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const targetId = path[2];
      await query('DELETE FROM users WHERE id = $1', [targetId]);
      return handleCORS(NextResponse.json({ success: true }));
    }

    // Get all roles
    if (route === '/admin/roles' && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || user.role_name !== 'superadmin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const result = await query('SELECT id, name FROM roles ORDER BY name ASC');
      return handleCORS(NextResponse.json(result.rows));
    }

    // Create a new role
    if (route === '/admin/roles' && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user || user.role_name !== 'superadmin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const { name } = await request.json();
      if (!name) {
        return handleCORS(NextResponse.json({ error: 'Role name is required' }, { status: 400 }));
      }

      // Check if role already exists
      const existing = await query('SELECT id FROM roles WHERE name = $1', [name.toLowerCase()]);
      if (existing.rows.length > 0) {
        return handleCORS(NextResponse.json({ error: 'Role already exists' }, { status: 400 }));
      }

      const result = await query('INSERT INTO roles (name) VALUES ($1) RETURNING *', [name.toLowerCase()]);
      return handleCORS(NextResponse.json(result.rows[0]));
    }

    // Delete a role
    if (route.startsWith('/admin/roles/') && method === 'DELETE') {
      const user = await authenticateRequest(request);
      if (!user || user.role_name !== 'superadmin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const roleId = path[2];

      // Safety check: Don't delete roles which are currently assigned to users
      const usersWithRole = await query('SELECT id FROM users WHERE role_id = $1 LIMIT 1', [roleId]);
      if (usersWithRole.rows.length > 0) {
        return handleCORS(NextResponse.json({ error: 'Cannot delete role as it is currently assigned to users.' }, { status: 400 }));
      }

      await query('DELETE FROM roles WHERE id = $1', [roleId]);
      return handleCORS(NextResponse.json({ success: true }));
    }

    // Get all permissions
    if (route === '/admin/permissions' && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || user.role_name !== 'superadmin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const result = await query('SELECT * FROM permissions ORDER BY name ASC');
      return handleCORS(NextResponse.json(result.rows));
    }

    // Get permissions for a specific role
    if (route.startsWith('/admin/roles/') && path[3] === 'permissions' && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || user.role_name !== 'superadmin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const roleId = path[2];
      const result = await query(`
        SELECT p.id, p.name 
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1
      `, [roleId]);

      return handleCORS(NextResponse.json(result.rows));
    }

    // Update permissions for a specific role
    if (route.startsWith('/admin/roles/') && path[3] === 'permissions' && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user || user.role_name !== 'superadmin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const roleId = path[2];
      const { permissionIds } = await request.json();

      if (!Array.isArray(permissionIds)) {
        return handleCORS(NextResponse.json({ error: 'permissionIds must be an array' }, { status: 400 }));
      }

      // Use a transaction if possible, or just delete and insert
      await query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

      if (permissionIds.length > 0) {
        for (const permId of permissionIds) {
          await query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [roleId, permId]);
        }
      }

      return handleCORS(NextResponse.json({ success: true }));
    }

    // --- DASHBOARD STATS ---
    if (route === '/admin/stats' && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const products = await query('SELECT COUNT(*) FROM products WHERE is_active = true');
      const quotations = await query('SELECT COUNT(*) FROM quotations');
      const orders = await query('SELECT COUNT(*) FROM orders');
      const customers = await query('SELECT COUNT(*) FROM b2b_customers');
      const pending = await query('SELECT COUNT(*) FROM b2b_customers WHERE status = $1', ['pending']);

      return handleCORS(NextResponse.json({
        products: parseInt(products.rows[0].count),
        quotations: parseInt(quotations.rows[0].count),
        orders: parseInt(orders.rows[0].count),
        customers: parseInt(customers.rows[0].count),
        pending_approvals: parseInt(pending.rows[0].count)
      }));
    }

    // Get all orders (Admin)
    if (route === '/admin/orders' && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const search = url.searchParams.get('search') || '';
      const dateFilter = url.searchParams.get('dateFilter') || 'today';
      const offset = (page - 1) * limit;

      let queryText = `
        SELECT o.*, c.company_name, u.email as user_email, u.phone as customer_phone
        FROM orders o
        LEFT JOIN b2b_customers c ON o.customer_id = c.id
        LEFT JOIN users u ON c.user_id = u.id
        WHERE 1=1
      `;

      const queryParams = [];
      let paramIdx = 1;

      if (search) {
        queryText += ` AND (o.order_number ILIKE $${paramIdx} OR c.company_name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx} OR u.phone ILIKE $${paramIdx})`;
        queryParams.push(`%${search}%`);
        paramIdx++;
      }

      // Date Filtering Logic
      const now = new Date();
      let startDate, endDate;

      if (dateFilter === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        startDate = new Date(yesterday.setHours(0, 0, 0, 0));
        endDate = new Date(yesterday.setHours(23, 59, 59, 999));
      } else if (dateFilter === 'tomorrow') {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        startDate = new Date(tomorrow.setHours(0, 0, 0, 0));
        endDate = new Date(tomorrow.setHours(23, 59, 59, 999));
      } else if (dateFilter === 'this_week') {
        const first = now.getDate() - now.getDay();
        startDate = new Date(now.setDate(first));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.setDate(first + 6));
        endDate.setHours(23, 59, 59, 999);
      } else if (dateFilter === 'this_month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      if (startDate && endDate && dateFilter !== 'all') {
        queryText += ` AND o.created_at >= $${paramIdx} AND o.created_at <= $${paramIdx + 1}`;
        queryParams.push(startDate.toISOString(), endDate.toISOString());
        paramIdx += 2;
      }

      // Count query before adding LIMIT/OFFSET
      const countQueryText = `SELECT COUNT(*) FROM (${queryText}) as count_query`;
      const countResult = await query(countQueryText, queryParams);
      const total = parseInt(countResult.rows[0].count);

      queryText += ` ORDER BY o.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      queryParams.push(limit, offset);

      const result = await query(queryText, queryParams);

      return handleCORS(NextResponse.json({
        orders: result.rows,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalOrders: total
      }));
    }

    // Get Order Details (Admin)
    if (route.startsWith('/admin/orders/') && method === 'GET') {
      const orderId = route.split('/')[3];
      // route is /admin/orders/123 -> split leads to ['', 'admin', 'orders', '123']?
      // No, /admin/orders/123. split('/') -> ["", "admin", "orders", "123"] -> index 3.
      // Wait, let's verify if route includes leading slash. Yes it does.

      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      if (!orderId || orderId === 'status') {
        // Skip if it matches other routes like /update-status if we had one, but we use POST below
      }

      const orderResult = await query(`
        SELECT o.*, c.company_name, u.email as customer_email, u.phone as customer_phone
        FROM orders o
        LEFT JOIN b2b_customers c ON o.customer_id = c.id
        LEFT JOIN users u ON c.user_id = u.id
        WHERE o.id = $1
      `, [orderId]);

      if (orderResult.rows.length === 0) {
        return handleCORS(NextResponse.json({ error: 'Order not found' }, { status: 404 }));
      }

      const itemsResult = await query(`
        SELECT oi.*, p.name as product_name, p.sku, p.images
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
      `, [orderId]);

      return handleCORS(NextResponse.json({
        ...orderResult.rows[0],
        items: itemsResult.rows
      }));
    }

    // Update Order (Admin)
    if (route.startsWith('/admin/orders/') && method === 'PUT') {
      const orderId = path[2];
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const body = await request.json();
      const { items, discount, tax, notes, status } = body;

      if (!items || !Array.isArray(items)) {
        return handleCORS(NextResponse.json({ error: 'Items array is required' }, { status: 400 }));
      }

      let subtotal = 0;
      for (const item of items) {
        subtotal += parseFloat(item.unit_price) * parseInt(item.quantity);
      }

      const total = subtotal - parseFloat(discount || 0) + parseFloat(tax || 0);

      // Start "transaction" by deleting items and updating order
      await query('DELETE FROM order_items WHERE order_id = $1', [orderId]);

      for (const item of items) {
        await query(`
          INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, line_total)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [orderId, item.product_id, item.product_name, item.quantity, item.unit_price, parseFloat(item.unit_price) * parseInt(item.quantity)]);
      }

      const orderUpdateResult = await query(`
        UPDATE orders 
        SET subtotal = $1, discount = $2, tax = $3, total = $4, notes = $5, status = $6, created_at = created_at
        WHERE id = $7
        RETURNING *
      `, [subtotal, discount || 0, tax || 0, total, notes, status || 'pending', orderId]);

      return handleCORS(NextResponse.json(orderUpdateResult.rows[0]));
    }

    // Resend Order Update Email (Admin)
    if (route.startsWith('/admin/orders/') && path[3] === 'resend' && method === 'POST') {
      const orderId = path[2];
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const orderResult = await query(`
        SELECT o.*, u.email as customer_email
        FROM orders o
        LEFT JOIN b2b_customers c ON o.customer_id = c.id
        LEFT JOIN users u ON c.user_id = u.id
        WHERE o.id = $1
      `, [orderId]);

      if (orderResult.rows.length === 0) {
        return handleCORS(NextResponse.json({ error: 'Order not found' }, { status: 404 }));
      }

      const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);

      const order = orderResult.rows[0];
      order.items = itemsResult.rows;

      await import('@/lib/email').then(m => m.sendOrderUpdateEmail(order, order.customer_email));

      return handleCORS(NextResponse.json({ success: true }));
    }

    // Update Order Status (Admin)
    if (route === '/admin/orders/update-status' && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const { order_id, status } = await request.json();

      if (!['pending', 'approved', 'processing', 'shipped', 'completed', 'cancelled'].includes(status)) {
        return handleCORS(NextResponse.json({ error: 'Invalid status' }, { status: 400 }));
      }

      await query('UPDATE orders SET status = $1 WHERE id = $2', [status, order_id]);

      return handleCORS(NextResponse.json({ success: true }));
    }

    // Get all customers for quotations
    if (route === '/admin/customers' && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const result = await query(
        `SELECT id, company_name, email, phone, is_approved
         FROM customers
         WHERE is_active = true
         ORDER BY company_name, email`
      );

      return handleCORS(NextResponse.json(result.rows));
    }

    // Get all B2B customers for management
    if (route === '/admin/b2b-customers' && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const result = await query(
        `SELECT c.*, u.email, u.name, u.phone
         FROM b2b_customers c
         LEFT JOIN users u ON c.user_id = u.id
         ORDER BY c.created_at DESC`
      );

      return handleCORS(NextResponse.json(result.rows));
    }

    // Approve/reject B2B customer
    if (route === '/admin/customers/approve' && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const body = await request.json();
      const { customer_id, status, discount_percentage } = body;

      const result = await query(
        `UPDATE b2b_customers 
         SET status = $1, discount_percentage = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [status, discount_percentage || 0, customer_id]
      );

      // Update user account activity based on approval
      if (result.rows.length > 0) {
        const userId = result.rows[0].user_id;
        const isActive = status === 'approved';
        await query('UPDATE users SET is_active = $1 WHERE id = $2', [isActive, userId]);
      }

      const customerData = await query(
        'SELECT u.email FROM b2b_customers c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = $1',
        [customer_id]
      );

      if (customerData.rows.length > 0) {
        await sendB2BApprovalEmail(customerData.rows[0].email, status);
      }

      return handleCORS(NextResponse.json({ success: true, customer: result.rows[0] }));
    }

    // Admin Profile Update
    if (route === '/admin/profile/update' && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const { name } = await request.json();

      await query('UPDATE users SET name = $1 WHERE id = $2', [name, user.id]);

      return handleCORS(NextResponse.json({ success: true }));
    }

    // Admin Change Password
    if (route === '/admin/profile/change-password' && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const { currentPassword, newPassword } = await request.json();

      // Verify current password
      const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
      const valid = await verifyPassword(currentPassword, userResult.rows[0].password_hash);

      if (!valid) {
        return handleCORS(NextResponse.json({ error: 'Incorrect current password' }, { status: 400 }));
      }

      const newHash = await hashPassword(newPassword);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);

      return handleCORS(NextResponse.json({ success: true }));
    }

    // Create quotation
    if (route === '/admin/quotations' && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const body = await request.json();
      const { customer_id, products, notes, show_total, valid_until } = body;

      let subtotal = 0;
      products.forEach(item => {
        subtotal += (item.custom_price || item.price) * item.quantity;
      });

      const quotationNumber = `QUO-${Date.now()}`;

      const quotResult = await query(
        `INSERT INTO quotations 
         (quotation_number, customer_id, created_by, total_amount, show_total, notes, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'draft') 
         RETURNING *`,
        [quotationNumber, customer_id, user.id, subtotal, show_total || false, notes]
      );

      const quotId = quotResult.rows[0].id;

      for (const item of products) {
        await query(
          `INSERT INTO quotation_items (quotation_id, product_id, product_name, quantity, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [quotId, item.product_id, item.name, item.quantity, item.custom_price || item.price, (item.custom_price || item.price) * item.quantity]
        );
      }

      return handleCORS(NextResponse.json({ success: true, quotation: quotResult.rows[0] }));
    }

    // Get quotations
    if (route === '/admin/quotations' && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const result = await query(
        `SELECT q.*, c.company_name, u.email as customer_email
         FROM quotations q
         LEFT JOIN b2b_customers c ON q.customer_id = c.id
         LEFT JOIN users u ON c.user_id = u.id
         ORDER BY q.created_at DESC`
      );

      return handleCORS(NextResponse.json(result.rows));
    }

    // Get single quotation with items
    if (route.startsWith('/admin/quotations/') && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const quotationId = path[2];

      // Get quotation details
      const quotResult = await query(
        `SELECT q.*, c.company_name, c.gstin, c.address, c.city, c.state, c.pincode, u.email as customer_email, u.name as customer_name, u.phone as customer_phone
         FROM quotations q
         LEFT JOIN b2b_customers c ON q.customer_id = c.id
         LEFT JOIN users u ON c.user_id = u.id
         WHERE q.id = $1`,
        [quotationId]
      );

      if (quotResult.rows.length === 0) {
        return handleCORS(NextResponse.json({ error: 'Quotation not found' }, { status: 404 }));
      }

      // Get quotation items
      const itemsResult = await query(
        `SELECT qi.*, p.sku, p.short_description
         FROM quotation_items qi
         LEFT JOIN products p ON qi.product_id = p.id
         WHERE qi.quotation_id = $1`,
        [quotationId]
      );

      const quotation = quotResult.rows[0];
      quotation.items = itemsResult.rows;

      return handleCORS(NextResponse.json(quotation));
    }

    // Preview quotation (without saving)
    if (route === '/admin/quotations/preview' && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const body = await request.json();
      const { customer_id, products, notes, show_total, valid_until } = body;

      // Get customer details
      const customerResult = await query(
        `SELECT c.*
         FROM customers c
         WHERE c.id = $1`,
        [customer_id]
      );

      if (customerResult.rows.length === 0) {
        return handleCORS(NextResponse.json({ error: 'Customer not found' }, { status: 404 }));
      }

      // Calculate totals
      let subtotal = 0;
      const itemsWithDetails = [];

      for (const item of products) {
        const productResult = await query(
          'SELECT * FROM products WHERE id = $1',
          [item.product_id]
        );

        if (productResult.rows.length > 0) {
          const product = productResult.rows[0];
          const unitPrice = item.custom_price || product.dealer_price || product.mrp_price;
          const totalPrice = unitPrice * item.quantity;
          subtotal += totalPrice;

          itemsWithDetails.push({
            product_id: item.product_id,
            product_name: product.name,
            sku: product.sku,
            short_description: product.short_description,
            quantity: item.quantity,
            unit_price: unitPrice,
            total_price: totalPrice
          });
        }
      }

      // Generate preview quotation number
      const previewNumber = `PREVIEW-${Date.now()}`;

      const preview = {
        quotation_number: previewNumber,
        customer: customerResult.rows[0],
        items: itemsWithDetails,
        subtotal: subtotal,
        total: subtotal,
        notes: notes,
        valid_until: valid_until,
        status: 'preview',
        created_at: new Date().toISOString()
      };

      return handleCORS(NextResponse.json(preview));
    }

    // Update quotation status (draft -> sent, etc.)
    if (route.startsWith('/admin/quotations/') && method === 'PUT') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const quotationId = path[2];
      const body = await request.json();
      const { status, notes } = body;

      const result = await query(
        'UPDATE quotations SET status = $1, notes = COALESCE($2, notes) WHERE id = $3 RETURNING *',
        [status, notes, quotationId]
      );

      if (result.rows.length === 0) {
        return handleCORS(NextResponse.json({ error: 'Quotation not found' }, { status: 404 }));
      }

      // If status is 'sent', send email to customer
      if (status === 'sent') {
        // Get quotation details with customer info
        const quotDetails = await query(
          `SELECT q.*, c.company_name, u.email as customer_email
           FROM quotations q
           LEFT JOIN customers c ON q.customer_id = c.id
           LEFT JOIN users u ON c.email = u.email
           WHERE q.id = $1`,
          [quotationId]
        );

        if (quotDetails.rows.length > 0) {
          const quotation = quotDetails.rows[0];
          // Get quotation items
          const itemsResult = await query(
            'SELECT * FROM quotation_items WHERE quotation_id = $1',
            [quotationId]
          );
          quotation.items = itemsResult.rows;

          try {
            // Send quotation email
            await sendQuotationEmail(quotation.customer_email, quotation);
          } catch (emailError) {
            console.error('Failed to send quotation email:', emailError);
            // Continue even if email fails
          }
        }
      }

      return handleCORS(NextResponse.json({ success: true, quotation: result.rows[0] }));
    }



    // ============ SITE SETTINGS ENDPOINTS ============

    // Get Site Settings
    if (route === '/site-settings' && method === 'GET') {
      // Ensure table exists (Lazy Migration)
      await query(`
        CREATE TABLE IF NOT EXISTS site_settings (
          id SERIAL PRIMARY KEY,
          meta_title TEXT,
          meta_description TEXT,
          head_scripts TEXT,
          body_scripts TEXT,
          google_analytics_id TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Ensure single row exists
      const check = await query('SELECT * FROM site_settings LIMIT 1');
      if (check.rows.length === 0) {
        await query('INSERT INTO site_settings (meta_title) VALUES ($1)', ['Pavilion Sports']);
      }

      const result = await query('SELECT * FROM site_settings LIMIT 1');
      return handleCORS(NextResponse.json(result.rows[0]));
    }

    // Update Site Settings
    if (route === '/site-settings' && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const body = await request.json();
      const { meta_title, meta_description, head_scripts, body_scripts, google_analytics_id } = body;

      // Ensure table exists (Lazy Migration)
      await query(`
        CREATE TABLE IF NOT EXISTS site_settings (
          id SERIAL PRIMARY KEY,
          meta_title TEXT,
          meta_description TEXT,
          head_scripts TEXT,
          body_scripts TEXT,
          google_analytics_id TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const check = await query('SELECT id FROM site_settings LIMIT 1');
      let result;

      if (check.rows.length === 0) {
        result = await query(
          `INSERT INTO site_settings (meta_title, meta_description, head_scripts, body_scripts, google_analytics_id, updated_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
             RETURNING *`,
          [meta_title, meta_description, head_scripts, body_scripts, google_analytics_id]
        );
      } else {
        result = await query(
          `UPDATE site_settings 
             SET meta_title = $1, meta_description = $2, head_scripts = $3, body_scripts = $4, google_analytics_id = $5, updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING *`,
          [meta_title, meta_description, head_scripts, body_scripts, google_analytics_id, check.rows[0].id]
        );
      }

      return handleCORS(NextResponse.json(result.rows[0]));
    }

    // Route not found
    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }));

  } catch (error) {
    console.error('API Error:', error);
    return handleCORS(NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 }));
  }
}

export const GET = handleRoute;
export const POST = handleRoute;
export const PUT = handleRoute;
export const DELETE = handleRoute;
export const PATCH = handleRoute;
