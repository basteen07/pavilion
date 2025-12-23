const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/api/[[...path]]/route.js');
let content = fs.readFileSync(filePath, 'utf8');

// The block to replace (found in Normal Register and Auth Register)
const targetBlock = `      const passwordHash = await hashPassword(password);
      const result = await query(
        \`INSERT INTO users (email, password_hash, name, phone, role, mfa_enabled, is_active) 
         VALUES ($1, $2, $3, $4, 'customer', false, true) 
         RETURNING id, email, name, phone, role\`,
        [email, passwordHash, name || null, phone || null]
      );`;

const replacementBlock = `      const roleResult = await query("SELECT id FROM roles WHERE name = 'normal_user'");
      const roleId = roleResult.rows[0]?.id;

      const passwordHash = await hashPassword(password);
      const result = await query(
        \`INSERT INTO users (email, password_hash, name, phone, role_id, mfa_enabled, is_active) 
         VALUES ($1, $2, $3, $4, $5, false, true) 
         RETURNING id, email, name, phone\`,
        [email, passwordHash, name || null, phone || null, roleId]
      );`;

// Normalize line endings to LF just in case
// content = content.replace(/\r\n/g, '\n'); 
// But targetBlock also needs to match. Windows might use CRLF.
// I'll try to match ignoring whitespace/newlines if I could but simple string replace is easiest if exact.
// I'll assume exact match from what I saw in view_file.

// If direct replace fails, we might need to be more flexible.
if (content.includes(targetBlock)) {
    console.log('Found target block. Replacing...');
    // Replace ALL occurrences (Normal and Auth Register)
    content = content.split(targetBlock).join(replacementBlock);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully patched route.js');
} else {
    console.log('Target block NOT found. Attempting lenient match...');
    // Try to strip whitespace for flexible matching (dangerous but maybe necessary)
    // Or just print a snippet to see what's wrong
    console.log('Snippet from file around line 357:');
    const lines = content.split('\n');
    console.log(lines.slice(356, 365).join('\n'));
}
