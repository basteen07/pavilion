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

// Activity Logging Helper (Wrapper)
async function logActivity(params) {
  try {
    const { logActivity: log } = await import('@/lib/activity-logger');
    await log(params);
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
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
  console.log('[Auth Debug] Authenticated user:', user.email, 'Role:', user.role_name, 'Last Active:', user.last_active_at);

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
    console.log('[Auth Debug] Superadmin bypass');
    // No timeout check for superadmin
  } else if (user.role_name === 'admin' || user.role_name === 'staff' || user.role_id === 1 || user.role_id === 2) {
    // Admins/Staff: 120 minutes timeout
    const TIMEOUT_MS = 120 * 60 * 1000;
    if (user.last_active_at) {
      const lastActive = new Date(user.last_active_at).getTime();
      const now = Date.now();
      const diff = now - lastActive;
      console.log('[Auth Debug] Admin timeout check:', { email: user.email, diff_min: Math.round(diff / 60000), timeout_min: 120 });

      if (diff > TIMEOUT_MS) {
        console.log('Session expired for:', user.email, 'Age:', Math.round(diff / 60000), 'min');
        return null; // Force 401
      }
    }
  } else if (user.role_name === 'b2b_user') {
    // B2B Users: No timeout (as per user request)
    console.log('[Auth Debug] B2B user bypass');
  } else {
    // Default for Other roles: 2 hours
    console.log('[Auth Debug] Default timeout check for role:', user.role_name);
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
      const slug = url.searchParams.get('slug');
      if (method === 'GET') return import('@/lib/api/categories').then(m => m.getTags({ subCategoryId, slug }));
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
        const user = await authenticateRequest(request);
        if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
        const body = await request.json();
        return import('@/lib/api/quotations').then(m => m.createQuotation(body, user.id));
      }
    }

    if (route.startsWith('/quotations/')) {
      const id = path[1];
      if (method === 'GET') return import('@/lib/api/quotations').then(m => m.getQuotationById(id));
      if (method === 'PUT') {
        const user = await authenticateRequest(request);
        if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
        const body = await request.json();
        return import('@/lib/api/quotations').then(m => m.updateQuotation(id, body, user.id));
      }
      if (method === 'DELETE') {
        const user = await authenticateRequest(request);
        if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
        return import('@/lib/api/quotations').then(m => m.deleteQuotation(id, user.id));
      }
    }

    // Send Quotation Email
    if (route.match(/^\/admin\/quotations\/[^/]+\/send-email$/) && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

      const quotationId = path[2]; // /admin/quotations/{id}/send-email
      const body = await request.json();
      const { email: targetEmail } = body;

      // Fetch quotation details
      const quoteRes = await query(`
        SELECT q.*, c.email as customer_email, c.company_name
        FROM quotations q
        LEFT JOIN customers c ON q.customer_id = c.id
        WHERE q.id = $1
      `, [quotationId]);

      if (quoteRes.rows.length === 0) {
        return handleCORS(NextResponse.json({ error: 'Quotation not found' }, { status: 404 }));
      }

      const quotation = quoteRes.rows[0];
      const recipientEmail = targetEmail || quotation.customer_email;

      if (!recipientEmail) {
        return handleCORS(NextResponse.json({ error: 'No email address provided' }, { status: 400 }));
      }

      // Send email
      const { sendQuotationEmail } = await import('@/lib/email');
      const emailResult = await sendQuotationEmail({
        quotation_number: quotation.quotation_number,
        total: quotation.total_amount
      }, recipientEmail);

      // Log activity
      await logActivity({
        admin_id: user.id,
        customer_id: quotation.customer_id,
        quotation_id: parseInt(quotationId),
        event_type: 'quotation_sent',
        description: `Sent quotation ${quotation.quotation_number} via email to ${recipientEmail}`,
        metadata: {
          quotation_number: quotation.quotation_number,
          email: recipientEmail,
          company_name: quotation.company_name,
          amount: quotation.total_amount
        }
      });

      // Update quotation status to 'Sent' if currently 'Draft'
      if (quotation.status === 'Draft') {
        await query('UPDATE quotations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['Sent', quotationId]);
      }

      return handleCORS(NextResponse.json({
        success: true,
        message: 'Quotation sent successfully',
        email_result: emailResult
      }));
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

      // Update last_active_at on login to start session fresh
      console.log('[Auth Debug] Attempting to update last_active_at for user:', user.email, 'ID:', user.id);
      const updateResult = await query('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING last_active_at', [user.id]);
      console.log('[Auth Debug] Update Result:', updateResult.rows);

      // Log Login Activity
      await logActivity({
        admin_id: user.id,
        event_type: 'login',
        description: `Admin ${user.name || user.email} logged in.`,
        metadata: { source: '/login', email: user.email, role: user.role_name }
      });

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
          error: 'Admin has not yet approved your registration. Please wait until the request is approved.',
          message: 'Admin has not yet approved your registration. Please wait until the request is approved.'
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

      // Update last_active_at on login to start session fresh
      console.log('[Auth Debug] Attempting to update last_active_at for user (auth/login):', user.email, 'ID:', user.id);
      const updateResultAuth = await query('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING last_active_at', [user.id]);
      console.log('[Auth Debug] Update Result (auth/login):', updateResultAuth.rows);

      // Log successful login for admin users
      if (user.role_name === 'admin' || user.role_name === 'superadmin') {
        await logActivity({
          admin_id: user.id,
          event_type: 'login',
          description: `Admin ${user.name || user.email} logged in.`,
          metadata: { source: '/auth/login', email: user.email, role: user.role_name }
        });
      }

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

    // ============ PASSWORD RESET ENDPOINTS ============

    // Forgot Password - send reset email
    if (route === '/auth/forgot-password' && method === 'POST') {
      const body = await request.json();
      const { email } = body;

      if (!email) {
        return handleCORS(NextResponse.json({ error: 'Email is required' }, { status: 400 }));
      }

      // Find user
      const result = await query('SELECT id, name, email FROM users WHERE email = $1 AND is_active = true', [email]);

      // Always return success to prevent email enumeration
      if (result.rows.length === 0) {
        return handleCORS(NextResponse.json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        }));
      }

      const user = result.rows[0];

      // Generate reset token (UUID)
      const { v4: uuidv4 } = await import('uuid');
      const resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      // Store token in users table (simpler approach)
      await query(
        'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
        [resetToken, expiresAt, user.id]
      );

      // Send reset email
      const { sendPasswordResetEmail } = await import('@/lib/email');
      await sendPasswordResetEmail(user.email, resetToken, user.name);

      // Log activity
      await logActivity({
        admin_id: user.id,
        event_type: 'password_reset_requested',
        description: `Password reset requested for ${user.email}`,
        metadata: { email: user.email }
      });

      return handleCORS(NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      }));
    }

    // Reset Password - validate token and set new password
    if (route === '/auth/reset-password' && method === 'POST') {
      const body = await request.json();
      const { token, password } = body;

      if (!token || !password) {
        return handleCORS(NextResponse.json({ error: 'Token and password are required' }, { status: 400 }));
      }

      if (password.length < 6) {
        return handleCORS(NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 }));
      }

      // Find user with valid token
      const result = await query(
        'SELECT id, name, email FROM users WHERE password_reset_token = $1 AND password_reset_expires > CURRENT_TIMESTAMP AND is_active = true',
        [token]
      );

      if (result.rows.length === 0) {
        return handleCORS(NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 }));
      }

      const user = result.rows[0];
      const passwordHash = await hashPassword(password);

      // Update password and clear reset token
      await query(
        'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
        [passwordHash, user.id]
      );

      // Log activity
      await logActivity({
        admin_id: user.id,
        event_type: 'password_reset',
        description: `Password reset completed for ${user.email}`,
        metadata: { email: user.email }
      });

      return handleCORS(NextResponse.json({
        success: true,
        message: 'Password has been reset successfully. You can now login with your new password.'
      }));
    }

    // ============ ADMIN LOGOUT ENDPOINT ============

    // Admin Logout - log activity
    if (route === '/admin/logout' && method === 'POST') {
      const user = await authenticateRequest(request);

      if (user) {
        await logActivity({
          admin_id: user.id,
          event_type: 'logout',
          description: `Admin ${user.name || user.email} logged out.`,
          metadata: { email: user.email, role: user.role_name }
        });
      }

      return handleCORS(NextResponse.json({ success: true, message: 'Logged out successfully' }));
    }

    // ============ B2B CUSTOMER ENDPOINTS ============

    // Register B2B customer (combined user + B2B registration)
    if (route === '/b2b/register' && method === 'POST') {
      const body = await request.json();
      const {
        email, password, name, phone, company_name, gstin, pan_number,
        business_type, address, address_line2, city, state, pincode,
        first_name, last_name
      } = body;

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
        [email, passwordHash, name || `${first_name} ${last_name}`.trim() || company_name || 'B2B User', phone || null, roleId]
      );

      const newUser = userResult.rows[0];

      // Create B2B customer record
      const b2bResult = await query(
        `INSERT INTO b2b_customers 
         (user_id, company_name, gstin, pan_number, business_type, address, address_line2, city, state, pincode, first_name, last_name, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending') 
         RETURNING *`,
        [
          newUser.id, company_name, gstin || null, pan_number || null, business_type || null,
          address || null, address_line2 || null, city || null, state || null, pincode || null,
          first_name || null, last_name || null
        ]
      );

      await query(
        'INSERT INTO b2b_customer_events (customer_id, event_type, description) VALUES ($1, $2, $3)',
        [b2bResult.rows[0].id, 'registration', 'New wholesale registration request received.']
      );

      await sendB2BApprovalEmail(email, 'pending');

      return handleCORS(NextResponse.json({
        success: true,
        user: newUser,
        customer: b2bResult.rows[0],
        message: 'Registration was successful. Once admin approved you will be notified via email. After that you can login.'
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

      const total = subtotal * 1.18; // 18% GST
      const tax = subtotal * 0.18;
      const discount = 0; // Standardized: No discount
      const orderNumber = `ORD-${Date.now()}`;

      const orderResult = await query(
        `INSERT INTO orders 
         (order_number, customer_id, subtotal, discount, tax, total, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'pending') 
         RETURNING *`,
        [orderNumber, customer.id, subtotal, discount, tax, total]
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

    // Get Single B2B Order Details
    if (route.startsWith('/b2b/orders/') && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const orderId = path[2];

      // Check ownership
      const customerResult = await query('SELECT id FROM b2b_customers WHERE user_id = $1', [user.id]);
      if (customerResult.rows.length === 0) {
        return handleCORS(NextResponse.json({ error: 'Customer profile not found' }, { status: 404 }));
      }
      const customerId = customerResult.rows[0].id;

      const orderResult = await query(
        'SELECT * FROM orders WHERE id = $1 AND customer_id = $2',
        [orderId, customerId]
      );

      if (orderResult.rows.length === 0) {
        return handleCORS(NextResponse.json({ error: 'Order not found' }, { status: 404 }));
      }

      const itemsResult = await query(`
        SELECT oi.*, p.name as product_name, p.slug, p.images, p.category_id, c.name as category_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE oi.order_id = $1
      `, [orderId]);

      const order = orderResult.rows[0];
      // Ensure dates are ISO strings for consistent client parsing
      order.created_at = new Date(order.created_at).toISOString();
      order.updated_at = order.updated_at ? new Date(order.updated_at).toISOString() : null;

      return handleCORS(NextResponse.json({
        ...order,
        items: itemsResult.rows
      }));
    }

    // Get B2B Timeline (Customer Perspective)
    if (route === '/b2b/timeline' && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const customerResult = await query('SELECT id FROM b2b_customers WHERE user_id = $1', [user.id]);
      if (customerResult.rows.length === 0) {
        return handleCORS(NextResponse.json([]));
      }
      const customerId = customerResult.rows[0].id;

      const events = await query(`
            SELECT * FROM (
                SELECT e.id, e.created_at, e.event_type, e.description, e.metadata, e.admin_id, u.name as admin_name
                FROM b2b_customer_events e
                LEFT JOIN users u ON e.admin_id = u.id
                WHERE e.customer_id = $1
                
                UNION ALL
                
                SELECT al.id, al.created_at, al.event_type, al.description, al.metadata, al.admin_id, u.name as admin_name
                FROM activity_logs al
                LEFT JOIN users u ON al.admin_id = u.id
                WHERE al.order_id IN (SELECT id FROM orders WHERE customer_id = $1)
            ) unified
            ORDER BY created_at DESC
        `, [customerId]);

      return handleCORS(NextResponse.json(events.rows));
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

      const total = subtotal + parseFloat(tax || 0); // Discount is 0
      const auditInfo = `${user.name || 'Admin'} (${user.email})`;

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
        SET subtotal = $1, discount = 0, tax = $2, total = $3, notes = $4, status = $5, edited_by = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `, [subtotal, tax || 0, total, notes, status || 'pending', auditInfo, orderId]);

      await logActivity({
        admin_id: user.id,
        customer_id: orderUpdateResult.rows[0].customer_id,
        quotation_id: null,
        event_type: 'order_updated',
        description: `Updated order ${orderUpdateResult.rows[0].order_number}. Status: ${status}`,
        metadata: { order_id: orderId, status }
      });

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

      const order_status_query = await query('SELECT status, customer_id FROM orders WHERE id = $1', [order_id]);
      const old_status = order_status_query.rows[0]?.status;
      const b2b_customer_id = order_status_query.rows[0]?.customer_id;

      await query('UPDATE orders SET status = $1 WHERE id = $2', [status, order_id]);

      // Log activity
      await logActivity({
        admin_id: user.id,
        order_id: order_id,
        event_type: 'order_status_updated',
        description: `Order status updated from ${old_status} to ${status}`,
        metadata: { old_status, new_status: status }
      });

      // Also log to b2b_customer_events if it's a B2B order
      if (b2b_customer_id) {
        await query(
          'INSERT INTO b2b_customer_events (customer_id, admin_id, event_type, description, metadata) VALUES ($1, $2, $3, $4, $5)',
          [b2b_customer_id, user.id, 'order_update', `Order status updated to ${status}`, JSON.stringify({ order_id, old_status, new_status: status })]
        );
      }

      await logActivity({
        admin_id: user.id,
        customer_id: null, // Could fetch if needed, but keeping it simple
        quotation_id: null,
        event_type: 'order_status_update',
        description: `Updated order status to ${status} for order ID ${order_id}`,
        metadata: { order_id, status }
      });

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

      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const search = url.searchParams.get('search') || '';
      const status = url.searchParams.get('status'); // optional

      const offset = (page - 1) * limit;

      let queryText = `
         SELECT c.*, u.email, u.name, u.phone
         FROM b2b_customers c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE 1=1
      `;
      const queryParams = [];
      let paramIdx = 1;

      if (search) {
        queryText += ` AND (c.company_name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx})`;
        queryParams.push(`%${search}%`);
        paramIdx++;
      }

      if (status) {
        if (status === 'history') {
          queryText += ` AND c.status != 'pending'`;
        } else {
          queryText += ` AND c.status = $${paramIdx++}`;
          queryParams.push(status);
        }
      }

      // Count query
      const countQueryText = `SELECT COUNT(*) FROM (${queryText}) as count_query`;
      const countResult = await query(countQueryText, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Main query
      queryText += ` ORDER BY (c.status = 'pending') DESC, c.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
      queryParams.push(limit, offset);

      const result = await query(queryText, queryParams);

      return handleCORS(NextResponse.json({
        customers: result.rows,
        total,
        totalPages: Math.ceil(total / limit),
        page,
        limit
      }));
    }

    // Approve/reject B2B customer
    if (route === '/admin/customers/approve' && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const body = await request.json();
      const { customer_id, status, discount_percentage, is_active } = body;

      // Get current state for event logging
      const currentRes = await query('SELECT status, discount_percentage, is_active FROM b2b_customers WHERE id = $1', [customer_id]);
      const current = currentRes.rows[0];

      const result = await query(
        `UPDATE b2b_customers 
         SET status = $1, 
             discount_percentage = $2, 
             is_active = COALESCE($3, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [status, discount_percentage || 0, is_active === undefined ? null : is_active, customer_id]
      );

      // Log the event
      if (result.rows.length > 0) {
        const updated = result.rows[0];
        let eventDescription = `Admin ${user.name} updated customer.`;
        if (current.status !== status) eventDescription += ` Status: ${current.status} -> ${status}.`;
        if (current.discount_percentage !== updated.discount_percentage) eventDescription += ` Discount: ${current.discount_percentage}% -> ${updated.discount_percentage}%.`;
        if (is_active !== undefined && current.is_active !== is_active) eventDescription += ` Account: ${is_active ? 'Activated' : 'Deactivated'}.`;

        await query(
          'INSERT INTO b2b_customer_events (customer_id, admin_id, event_type, description, metadata) VALUES ($1, $2, $3, $4, $5)',
          [customer_id, user.id, 'status_update', eventDescription, JSON.stringify({ old: current, new: updated })]
        );

        // GLOBAL ACTIVITY LOG for B2B status changes
        const eventType = status === 'approved' ? 'b2b_approved' :
          status === 'rejected' ? 'b2b_rejected' : 'b2b_status_update';
        await logActivity({
          admin_id: user.id,
          customer_id: customer_id,
          event_type: eventType,
          description: eventDescription,
          metadata: {
            company_name: updated.company_name,
            old_status: current.status,
            new_status: status,
            is_active: is_active
          }
        });

        // Update user account activity based on approval OR manual toggle
        const userId = updated.user_id;
        const shouldBeActive = status === 'approved' ? (is_active !== undefined ? is_active : true) : false;
        await query('UPDATE users SET is_active = $1 WHERE id = $2', [shouldBeActive, userId]);
      }

      const customerData = await query(
        'SELECT u.email FROM b2b_customers c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = $1',
        [customer_id]
      );

      if (customerData.rows.length > 0 && status !== 'pending') {
        // Send email on any status update (approved/rejected)
        await sendB2BApprovalEmail(customerData.rows[0].email, status);

        // Log email event
        await query(
          'INSERT INTO b2b_customer_events (customer_id, admin_id, event_type, description) VALUES ($1, $2, $3, $4)',
          [customer_id, user.id, 'email_sent', `Approval email sent with status: ${status}`]
        );

        // GLOBAL ACTIVITY LOG
        await logActivity({
          admin_id: user.id,
          customer_id: customer_id,
          event_type: 'email_sent',
          description: `B2B Approval email (${status}) sent to customer.`,
          metadata: { status }
        });
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
      const {
        customer_id,
        products,
        items, // Support both names
        notes,
        show_total,
        valid_until,
        subtotal: bodySubtotal,
        gst,
        total_amount: bodyTotal,
        quotation_number: bodyQuotationNumber,
        terms_and_conditions,
        customer_snapshot,
        shipping_cost,
        discount_type,
        discount_value,
        tax_rate,
        status: bodyStatus
      } = body;

      const quotationItemsList = items || products || [];
      let calcSubtotal = 0;
      quotationItemsList.forEach(item => {
        calcSubtotal += (item.unit_price || item.custom_price || item.price || 0) * (item.quantity || 1);
      });

      const finalSubtotal = bodySubtotal !== undefined ? bodySubtotal : calcSubtotal;
      const finalTax = gst || 0;
      const finalTotal = bodyTotal !== undefined ? bodyTotal : (finalSubtotal + finalTax);
      const quotationNumber = bodyQuotationNumber || `QUO-${Date.now()}`;

      const quotResult = await query(
        `INSERT INTO quotations 
         (quotation_number, customer_id, created_by, total_amount, subtotal, tax, show_total, notes, valid_until, terms_conditions, status, customer_snapshot, shipping_cost, discount_type, discount_value, tax_rate) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
         RETURNING *`,
        [
          quotationNumber,
          customer_id,
          user.id,
          finalTotal,
          finalSubtotal,
          finalTax,
          show_total !== undefined ? show_total : true,
          notes,
          valid_until,
          terms_and_conditions,
          bodyStatus || 'draft',
          JSON.stringify(customer_snapshot || {}),
          shipping_cost || 0,
          discount_type || 'percentage',
          discount_value || 0,
          tax_rate || 18,
        ]
      );

      const quotId = quotResult.rows[0].id;

      // Log the event if it's a B2B customer
      const b2bCheck = await query('SELECT id FROM b2b_customers WHERE id = $1', [customer_id]);
      if (b2bCheck.rows.length > 0) {
        await query(
          'INSERT INTO b2b_customer_events (customer_id, admin_id, event_type, description, metadata) VALUES ($1, $2, $3, $4, $5)',
          [customer_id, user.id, 'quotation_created', `Admin ${user.name} created quotation ${quotationNumber}.`, JSON.stringify({ quotation_id: quotId })]
        );
      }

      // GLOBAL ACTIVITY LOG
      await logActivity({
        admin_id: user.id,
        customer_id: customer_id,
        quotation_id: quotId,
        event_type: 'quotation_created',
        description: `Admin ${user.name || user.email} created quotation ${quotationNumber}.`,
        metadata: { quotation_number: quotationNumber }
      });

      for (const item of quotationItemsList) {
        const unitPrice = item.unit_price || item.custom_price || item.price || 0;
        const qty = item.quantity || 1;
        const lineTotal = unitPrice * qty;

        await query(
          `INSERT INTO quotation_items (quotation_id, product_id, product_name, quantity, unit_price, total_price, mrp, discount, dealer_price, slug, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            quotId,
            item.product_id,
            item.product_name || item.name,
            qty,
            unitPrice,
            lineTotal,
            item.mrp || 0,
            item.discount || 0,
            item.dealer_price || 0,
            item.slug || null,
            lineTotal
          ]
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
        `SELECT qi.*, p.sku, p.short_description, p.dealer_price as current_dealer_price, p.mrp_price as current_mrp
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
    // Update quotation status or full details
    if (route.startsWith('/admin/quotations/') && method === 'PUT') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const quotationId = path[2];
      const body = await request.json();
      const {
        status, notes, items, subtotal, gst,
        total_amount, valid_until, show_total,
        terms_and_conditions, customer_snapshot,
        shipping_cost, discount_type, discount_value,
        tax_rate
      } = body;

      // Get current state for event logging
      const currentRes = await query('SELECT * FROM quotations WHERE id = $1', [quotationId]);
      if (currentRes.rows.length === 0) {
        return handleCORS(NextResponse.json({ error: 'Quotation not found' }, { status: 404 }));
      }
      const current = currentRes.rows[0];

      // If items are provided, it's a full edit
      if (items && Array.isArray(items)) {
        await query('DELETE FROM quotation_items WHERE quotation_id = $1', [quotationId]);
        for (const item of items) {
          const unitPrice = item.unit_price || item.custom_price || 0;
          const qty = item.quantity || 1;
          const lineTotal = unitPrice * qty;

          await query(
            `INSERT INTO quotation_items (quotation_id, product_id, product_name, quantity, unit_price, total_price, mrp, discount, dealer_price, slug, line_total)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              quotationId,
              item.product_id,
              item.product_name || item.name,
              qty,
              unitPrice,
              lineTotal,
              item.mrp || 0,
              item.discount || 0,
              item.dealer_price || 0,
              item.slug || null,
              lineTotal
            ]
          );
        }

        await query(
          `UPDATE quotations 
           SET total_amount = $1, subtotal = $2, tax = $3, notes = $4, 
               valid_until = $5, show_total = $6, terms_conditions = $7, 
               status = COALESCE($8, status), 
               customer_snapshot = COALESCE($9, customer_snapshot),
               shipping_cost = $10, 
               discount_type = $11, 
               discount_value = $12, 
               tax_rate = $13,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $14`,
          [
            total_amount || 0,
            subtotal || 0,
            gst || 0,
            notes,
            valid_until,
            show_total !== undefined ? show_total : true,
            terms_and_conditions,
            status,
            customer_snapshot ? JSON.stringify(customer_snapshot) : null,
            shipping_cost || 0,
            discount_type || 'percentage',
            discount_value || 0,
            tax_rate || 18,
            quotationId
          ]
        );
      } else {
        // Just a status/notes update
        await query(
          'UPDATE quotations SET status = $1, notes = COALESCE($2, notes), updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [status, notes, quotationId]
        );
      }

      const updatedRes = await query('SELECT * FROM quotations WHERE id = $1', [quotationId]);
      const updated = updatedRes.rows[0];

      // Log the event if it's a B2B customer
      const b2bCheck = await query('SELECT id FROM b2b_customers WHERE id = $1', [updated.customer_id]);
      if (b2bCheck.rows.length > 0) {
        let eventType = 'quotation_updated';
        let description = `Admin ${user.name} edited quotation ${updated.quotation_number}.`;

        if (current.status !== updated.status) {
          eventType = 'quotation_status_update';
          description = `Admin ${user.name} changed status of quotation ${updated.quotation_number} from ${current.status} to ${updated.status}.`;
          if (updated.status === 'cancelled') {
            description = `Admin ${user.name} cancelled quotation ${updated.quotation_number}.`;
          }
        }

        await query(
          'INSERT INTO b2b_customer_events (customer_id, admin_id, event_type, description, metadata) VALUES ($1, $2, $3, $4, $5)',
          [updated.customer_id, user.id, eventType, description, JSON.stringify({ quotation_id: quotationId, old: { status: current.status }, new: { status: updated.status } })]
        );
      }

      // GLOBAL ACTIVITY LOG
      await logActivity({
        admin_id: user.id,
        customer_id: updated.customer_id,
        quotation_id: quotationId,
        event_type: current.status !== updated.status ? 'quotation_status_update' : 'quotation_updated',
        description: current.status !== updated.status
          ? `Admin ${user.name || user.email} changed status of quotation ${updated.quotation_number} from ${current.status} to ${updated.status}.`
          : `Admin ${user.name || user.email} edited quotation ${updated.quotation_number}.`,
        metadata: {
          quotation_number: updated.quotation_number,
          old_status: current.status,
          new_status: updated.status
        }
      });

      // If status changed to 'sent' now, send email
      if (status === 'sent' && current.status !== 'sent') {
        // Get full quotation details for email
        const quotDetails = await query(
          `SELECT q.*, c.company_name, u.email as customer_email, u.name as customer_name
           FROM quotations q
           LEFT JOIN b2b_customers c ON q.customer_id = c.id
           LEFT JOIN users u ON c.user_id = u.id
           WHERE q.id = $1`,
          [quotationId]
        );

        if (quotDetails.rows.length > 0) {
          const quotation = quotDetails.rows[0];
          const itemsRes = await query('SELECT * FROM quotation_items WHERE quotation_id = $1', [quotationId]);
          quotation.items = itemsRes.rows;

          try {
            await sendQuotationEmail(quotation.customer_email, quotation);

            // Log email event
            await query(
              'INSERT INTO b2b_customer_events (customer_id, admin_id, event_type, description) VALUES ($1, $2, $3, $4)',
              [quotation.customer_id, user.id, 'email_sent', `Quotation ${quotation.quotation_number} sent via email to ${quotation.customer_email}.`]
            );

            // GLOBAL ACTIVITY LOG
            await logActivity({
              admin_id: user.id,
              customer_id: quotation.customer_id,
              quotation_id: quotationId,
              event_type: 'email_sent',
              description: `Quotation ${quotation.quotation_number} sent to ${quotation.customer_email}.`,
              metadata: { to: quotation.customer_email, quotation_number: quotation.quotation_number }
            });
          } catch (err) {
            console.error('Email send err:', err);
          }
        }
      }

      return handleCORS(NextResponse.json({ success: true, quotation: updated }));
    }



    // Get specific wholesale customer details for full page view
    if (route.startsWith('/admin/wholesale-customers/') && method === 'GET' && path.length === 3) {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const id = path[2];
      const customer = await query(`
            SELECT c.*, u.email, u.name, u.phone, u.created_at as user_created_at
            FROM b2b_customers c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.id = $1
        `, [id]);

      if (customer.rows.length === 0) {
        return handleCORS(NextResponse.json({ error: 'Customer not found' }, { status: 404 }));
      }

      return handleCORS(NextResponse.json(customer.rows[0]));
    }

    // Update wholesale customer details (terms, comments)
    if (route.startsWith('/admin/wholesale-customers/') && method === 'PUT' && path.length === 3) {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const id = path[2];
      const { terms_and_conditions, admin_comments } = await request.json();

      // Get current values for logging
      const current = await query('SELECT terms_and_conditions, admin_comments FROM b2b_customers WHERE id = $1', [id]);

      const result = await query(`
            UPDATE b2b_customers 
            SET terms_and_conditions = $1, admin_comments = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `, [terms_and_conditions, admin_comments, id]);

      if (result.rows.length > 0) {
        let logMsg = `Admin ${user.name} updated notes/terms.`;
        if (current.rows[0].admin_comments !== admin_comments) logMsg += ' Comments updated.';
        if (current.rows[0].terms_and_conditions !== terms_and_conditions) logMsg += ' Terms updated.';

        await query(
          'INSERT INTO b2b_customer_events (customer_id, admin_id, event_type, description) VALUES ($1, $2, $3, $4)',
          [id, user.id, 'profile_update', logMsg]
        );
      }

      return handleCORS(NextResponse.json(result.rows[0]));
    }

    // Get wholesale customer timeline
    if (route.startsWith('/admin/wholesale-customers/') && route.endsWith('/timeline') && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const id = path[2];
      const events = await query(`
            SELECT * FROM (
                SELECT e.id, e.created_at, e.event_type, e.description, e.metadata, e.admin_id, u.name as admin_name
                FROM b2b_customer_events e
                LEFT JOIN users u ON e.admin_id = u.id
                WHERE e.customer_id = $1
                
                UNION ALL
                
                SELECT al.id, al.created_at, al.event_type, al.description, al.metadata, al.admin_id, u.name as admin_name
                FROM activity_logs al
                LEFT JOIN users u ON al.admin_id = u.id
                WHERE al.order_id IN (SELECT id FROM orders WHERE customer_id = $1)
            ) unified
            ORDER BY created_at DESC
        `, [id]);

      return handleCORS(NextResponse.json(events.rows));
    }

    // Get wholesale customer orders
    if (route.startsWith('/admin/wholesale-customers/') && route.endsWith('/orders') && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const id = path[2]; // This is the b2b_customer.id
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '5');
      const offset = (page - 1) * limit;

      const countResult = await query('SELECT COUNT(*) FROM orders WHERE customer_id = $1', [id]);
      const total = parseInt(countResult.rows[0].count);

      const orders = await query(`
            SELECT * FROM orders 
            WHERE customer_id = $1 
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, [id, limit, offset]);

      return handleCORS(NextResponse.json({
        orders: orders.rows,
        total,
        totalPages: Math.ceil(total / limit),
        page,
        limit
      }));
    }

    // Get wholesale customer quotations
    if (route.startsWith('/admin/wholesale-customers/') && route.endsWith('/quotations') && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const id = path[2]; // This is the b2b_customer.id
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '5');
      const offset = (page - 1) * limit;

      const countResult = await query('SELECT COUNT(*) FROM quotations WHERE customer_id = $1', [id]);
      const total = parseInt(countResult.rows[0].count);

      const quotations = await query(`
            SELECT q.*, u.name as created_by_name
            FROM quotations q
            LEFT JOIN users u ON q.created_by = u.id
            WHERE q.customer_id = $1 
            ORDER BY q.created_at DESC
            LIMIT $2 OFFSET $3
        `, [id, limit, offset]);

      return handleCORS(NextResponse.json({
        quotations: quotations.rows,
        total,
        totalPages: Math.ceil(total / limit),
        page,
        limit
      }));
    }

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

    // --- NEW: Activity Logs API ---
    if (route === '/admin/activity-logs' && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      // --- Filter Parameters ---
      const adminIdFilter = url.searchParams.get('admin_id');
      const eventTypeFilter = url.searchParams.get('event_type');
      const moduleFilter = url.searchParams.get('module');
      const fromDate = url.searchParams.get('from_date');
      const toDate = url.searchParams.get('to_date');
      const myOnly = url.searchParams.get('my_only') === 'true';

      // Module to event type mapping
      const moduleEventTypes = {
        quotations: ['quotation_created', 'quotation_updated', 'quotation_status_update', 'quotation_cancelled', 'email_sent'],
        wholesale: ['b2b_approved', 'b2b_rejected', 'b2b_status_update', 'status_update', 'registration'],
        orders: ['order_created', 'order_updated', 'order_status_updated', 'order_status_update'],
        system: ['login', 'logout', 'comment_added', 'profile_update']
      };

      // Build dynamic WHERE clauses
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;

      // My only filter (overrides admin_id filter)
      if (myOnly) {
        whereConditions.push(`al.admin_id = $${paramIndex}`);
        params.push(user.id);
        paramIndex++;
      } else if (adminIdFilter) {
        whereConditions.push(`al.admin_id = $${paramIndex}`);
        params.push(adminIdFilter);
        paramIndex++;
      }

      // Event type filter
      if (eventTypeFilter) {
        whereConditions.push(`al.event_type = $${paramIndex}`);
        params.push(eventTypeFilter);
        paramIndex++;
      }

      // Module filter (expands to multiple event types)
      if (moduleFilter && moduleEventTypes[moduleFilter]) {
        const eventTypes = moduleEventTypes[moduleFilter];
        const placeholders = eventTypes.map((_, i) => `$${paramIndex + i}`).join(', ');
        whereConditions.push(`al.event_type IN (${placeholders})`);
        params.push(...eventTypes);
        paramIndex += eventTypes.length;
      }

      // Date range filters
      if (fromDate) {
        whereConditions.push(`al.created_at >= $${paramIndex}`);
        params.push(fromDate);
        paramIndex++;
      }

      if (toDate) {
        whereConditions.push(`al.created_at <= $${paramIndex}::date + interval '1 day'`);
        params.push(toDate);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Add limit and offset to params
      params.push(limit, offset);

      const result = await query(`
        SELECT al.*, u.name as admin_name, c.company_name as customer_name
        FROM activity_logs al
        LEFT JOIN users u ON al.admin_id = u.id
        LEFT JOIN customers c ON al.customer_id = c.id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, params);

      // Also get total count for pagination
      const countParams = params.slice(0, -2); // Remove limit and offset
      const countResult = await query(`
        SELECT COUNT(*) as total
        FROM activity_logs al
        ${whereClause}
      `, countParams);

      return handleCORS(NextResponse.json({
        logs: result.rows,
        total: parseInt(countResult.rows[0]?.total || 0),
        limit,
        offset
      }));
    }

    if (route.startsWith('/admin/activity-logs/customer/') && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const customerId = path[3];
      const result = await query(`
        SELECT al.*, u.name as admin_name
        FROM activity_logs al
        LEFT JOIN users u ON al.admin_id = u.id
        WHERE al.customer_id = $1
        ORDER BY al.created_at DESC
      `, [customerId]);

      return handleCORS(NextResponse.json(result.rows));
    }

    if (route === '/admin/activity-logs' && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const body = await request.json();
      const { customer_id, quotation_id, event_type, description, metadata } = body;

      await logActivity({
        admin_id: user.id,
        customer_id,
        quotation_id,
        event_type: event_type || 'comment_added',
        description,
        metadata
      });

      return handleCORS(NextResponse.json({ success: true }));
    }

    // --- Get Admin Users List (for activity log filtering) ---
    if (route === '/admin/admin-users-list' && method === 'GET') {
      const user = await authenticateRequest(request);
      if (!user || (user.role_name !== 'superadmin' && user.role_name !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const result = await query(`
        SELECT u.id, u.name, u.email
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        WHERE r.name IN ('superadmin', 'admin') AND u.is_active = true
        ORDER BY u.name
      `);

      return handleCORS(NextResponse.json(result.rows));
    }

    // --- Admin Logout (with activity logging) ---
    if (route === '/admin/logout' && method === 'POST') {
      const user = await authenticateRequest(request);
      if (!user) {
        return handleCORS(NextResponse.json({ success: true })); // Silent success even if not auth'd
      }

      await logActivity({
        admin_id: user.id,
        event_type: 'logout',
        description: `Admin ${user.name || user.email} logged out.`,
        metadata: { source: '/admin/logout', email: user.email, role: user.role_name }
      });
      return handleCORS(NextResponse.json({ success: true }));
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


