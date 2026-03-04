import { z } from 'zod';
import { validationMessages } from '@/config/validation-messages';

/**
 * Login form validation schema
 * Centralized validation rules for login form
 * Uses centralized validation messages from config/validation-messages.ts
 */
export const loginSchema = z.object({
  email: z.string().email(validationMessages.emailInvalid),
  password: z.string().min(8, validationMessages.passwordMinLength),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Signup form validation schema
 * Centralized validation rules for signup form
 * Includes password strength requirements and confirm password matching
 * Uses centralized validation messages from config/validation-messages.ts
 */
export const signupSchema = z.object({
  email: z.string().email(validationMessages.emailInvalid),
  password: z.string()
    .min(8, validationMessages.passwordMinLength)
    .regex(/[a-zA-Z]/, validationMessages.passwordRequiresLetter)
    .regex(/[0-9]/, validationMessages.passwordRequiresNumber),
  confirmPassword: z.string(),
  name: z.string()
    .min(2, validationMessages.nameMinLength)
    .max(50, validationMessages.nameMaxLength),
}).refine((data) => data.password === data.confirmPassword, {
  message: validationMessages.passwordsDontMatch,
  path: ["confirmPassword"],
});

export type SignupFormData = z.infer<typeof signupSchema>;

