require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function query(text, params) {
  return pool.query(text, params);
}

async function updateSchema() {
  console.log('Starting RBAC schema update...');
  const dbUrl = process.env.DATABASE_URL;
  console.log('DB URL exists:', !!dbUrl, dbUrl ? dbUrl.substring(0, 15) + '...' : 'N/A');

  if (!dbUrl) {
    console.error('DATABASE_URL is missing!');
    process.exit(1);
  }

  try {
    // Test connection first
    await pool.query('SELECT 1');
    console.log('Database connection successful');

    // 1. Create permissions table
    await query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created permissions table');

    // 2. Create role_permissions table
    await query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (role_id, permission_id)
      )
    `);
    console.log('Created role_permissions table');

    // 3. Seed initial permissions
    const permissions = [
      { name: 'view_dashboard', description: 'Access to view the admin dashboard' },
      { name: 'manage_users', description: 'Create, edit, and delete users' },
      { name: 'manage_roles', description: 'Manage roles and permissions' },
      { name: 'manage_products', description: 'Create, edit, and delete products' },
      { name: 'manage_orders', description: 'View and process orders' },
      { name: 'manage_customers', description: 'Approve and manage B2B customers' },
      { name: 'view_reports', description: 'View business reports and analytics' },
      { name: 'manage_content', description: 'Manage blogs, banners, and CMS pages' }
    ];

    for (const perm of permissions) {
      await query(`
        INSERT INTO permissions (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
      `, [perm.name, perm.description]);
    }
    console.log('Seeded permissions');

    // 4. Assign all permissions to superadmin role
    // First get superadmin role id
    const superadminRole = await query("SELECT id FROM roles WHERE name = 'superadmin'");
    if (superadminRole.rows.length > 0) {
      const roleId = superadminRole.rows[0].id;

      // Get all permission ids
      const allPerms = await query('SELECT id FROM permissions');

      for (const perm of allPerms.rows) {
        await query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [roleId, perm.id]);
      }
      console.log('Assigned all permissions to superadmin');
    }

    // 5. Assign partial permissions to admin role (example)
    const adminRole = await query("SELECT id FROM roles WHERE name = 'admin'");
    if (adminRole.rows.length > 0) {
      const roleId = adminRole.rows[0].id;
      // Assign specific permissions to regular admin
      const adminPerms = ['view_dashboard', 'manage_products', 'manage_orders', 'manage_customers', 'manage_content'];

      for (const permName of adminPerms) {
        const permResult = await query('SELECT id FROM permissions WHERE name = $1', [permName]);
        if (permResult.rows.length > 0) {
          await query(`
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `, [roleId, permResult.rows[0].id]);
        }
      }
      console.log('Assigned permissions to admin');
    }

    console.log('RBAC schema update completed successfully');
  } catch (error) {
    console.error('Error updating schema:', error);
    require('fs').writeFileSync('schema_error.log', JSON.stringify(error, null, 2) + '\n' + error.toString());
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateSchema();
