/**
 * Input Validation & Sanitization — Zod-based schemas.
 *
 * Every public-facing input is validated against a strict schema.
 * .strict() rejects unexpected fields (mass-assignment protection).
 *
 * OWASP Reference: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
 */

import { z } from 'zod';

// ─── Shared field definitions ─────────────────────────────────────────────────

const emailField = z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be at most 255 characters')
    .transform((v) => v.toLowerCase().trim());

const passwordField = z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be at most 128 characters');

const strongPasswordField = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters');

const nameField = z
    .string()
    .max(255, 'Name must be at most 255 characters')
    .transform((v) => v.trim());

const phoneField = z
    .string()
    .max(20, 'Phone must be at most 20 characters')
    .regex(/^[+\d\s\-()]*$/, 'Phone contains invalid characters')
    .optional()
    .nullable();

const uuidField = z.string().uuid('Invalid ID format');

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

/** Login — email + password + optional MFA code */
export const loginSchema = z.object({
    email: emailField,
    password: z.string().min(1, 'Password is required').max(128),
    mfa_code: z
        .string()
        .length(6, 'MFA code must be 6 digits')
        .regex(/^\d+$/, 'MFA code must be numeric')
        .optional()
        .nullable(),
}).strict();

/** Registration — public user self-registration */
export const registerSchema = z.object({
    email: emailField,
    password: strongPasswordField,
    name: nameField.optional(),
    full_name: nameField.optional(),
    phone: phoneField,
}).strict();

/** Forgot password — email only */
export const forgotPasswordSchema = z.object({
    email: emailField,
}).strict();

/** Reset password — token + new password */
export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required').max(255),
    password: strongPasswordField,
}).strict();

// ─── B2B Registration Schema ─────────────────────────────────────────────────

export const b2bRegisterSchema = z.object({
    email: emailField,
    password: strongPasswordField,
    name: nameField.optional(),
    first_name: nameField.optional(),
    last_name: nameField.optional(),
    phone: phoneField,
    company_name: z.string().min(1, 'Company name is required').max(255).transform((v) => v.trim()),
    gstin: z.string().max(50).optional().nullable(),
    pan_number: z.string().max(50).optional().nullable(),
    business_type: z.string().max(100).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    address_line2: z.string().max(500).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    pincode: z.string().max(10).optional().nullable(),
}).strict();

// ─── Public Endpoint Schemas ──────────────────────────────────────────────────

/** Enquiry form submission */
export const enquirySchema = z.object({
    name: z.string().min(1, 'Name is required').max(255).transform((v) => v.trim()),
    email: emailField,
    phone: z.string().min(1, 'Phone is required').max(20),
    message: z.string().max(2000, 'Message must be at most 2000 characters').optional().nullable(),
    product: z.string().min(1, 'Product is required').max(500),
}).strict();

/** Email validation endpoint */
export const validateEmailSchema = z.object({
    email: emailField,
}).strict();

// ─── MFA Schema ───────────────────────────────────────────────────────────────

export const mfaVerifySchema = z.object({
    code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
}).strict();

// ─── Admin CRUD Schemas ───────────────────────────────────────────────────────

/** Create admin user */
export const createUserSchema = z.object({
    email: emailField,
    password: strongPasswordField,
    name: nameField.optional().nullable(),
    phone: phoneField,
    role_id: uuidField,
}).strict();

/** Create/update role */
export const roleSchema = z.object({
    name: z.string().min(1).max(50).transform((v) => v.trim()),
}).strict();

/** Update role permissions */
export const rolePermissionsSchema = z.object({
    permissionIds: z.array(uuidField).max(100, 'Too many permissions'),
}).strict();

/** Order status update */
export const orderStatusSchema = z.object({
    order_id: uuidField,
    status: z.enum(['pending', 'approved', 'processing', 'shipped', 'completed', 'cancelled']),
}).strict();

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Validate and sanitize input against a Zod schema.
 * Returns { success: true, data } on valid input, or
 *         { success: false, error } with a user-friendly message on failure.
 *
 * @param {unknown} rawData – Raw request body
 * @param {z.ZodSchema} schema – Zod schema to validate against
 * @returns {{ success: true, data: any } | { success: false, error: string }}
 */
export function validateInput(rawData, schema) {
    const result = schema.safeParse(rawData);
    if (result.success) {
        return { success: true, data: result.data };
    }

    // Build a user-friendly error message from Zod issues
    const messages = result.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${path}${issue.message}`;
    });

    return { success: false, error: messages.join('; ') };
}
