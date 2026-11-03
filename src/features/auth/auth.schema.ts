import { z } from 'zod';

import { displayNameSchema } from '@/features/profile/profile.schema';

/** Supabase Auth enforces the same rules server-side (length 8, letters and digits). */
export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt ignores bytes past 72, so longer passwords would be silently truncated. */
export const PASSWORD_MAX_LENGTH = 72;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Enter your email address.')
  .max(254, 'That email address is too long.')
  .pipe(z.email('Enter a valid email address.'));

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_LENGTH, {
    error: 'That password is too long.',
  })
  .refine((value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value), {
    error: 'Include at least one letter (a–z) and one number.',
  });

/** Sign-in only checks presence: older accounts may predate the current rules. */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

export const signUpSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: newPasswordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: newPasswordSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
