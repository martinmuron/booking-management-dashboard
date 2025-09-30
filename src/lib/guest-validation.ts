import { z } from 'zod';

export const NAME_CHAR_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/u;
export const ISO_ALPHA3_REGEX = /^[A-Z]{3}$/;
export const DOCUMENT_NUMBER_REGEX = /^[A-Z0-9]{4,30}$/;
export const PHONE_REGEX = /^[0-9+()\s-]{6,20}$/;

const isoAlpha3Schema = z.string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => ISO_ALPHA3_REGEX.test(value), {
    message: 'Must be a three-letter ISO 3166-1 alpha-3 code'
  });

const optionalIsoAlpha3Schema = z.string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => value === '' || ISO_ALPHA3_REGEX.test(value), {
    message: 'Must be a three-letter ISO 3166-1 alpha-3 code'
  })
  .transform((value) => (value === '' ? undefined : value))
  .optional();

export const guestSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(64).refine((value) => NAME_CHAR_REGEX.test(value), {
    message: 'Only letters, spaces, apostrophes and hyphens are allowed'
  }),
  lastName: z.string().trim().min(1, 'Last name is required').max(64).refine((value) => NAME_CHAR_REGEX.test(value), {
    message: 'Only letters, spaces, apostrophes and hyphens are allowed'
  }),
  email: z.string().trim().max(128).email('Invalid email address').optional().or(z.literal('')).transform((value) => (value ? value : undefined)),
  phone: z.string().trim().refine((value) => value === '' || PHONE_REGEX.test(value), {
    message: 'Invalid phone number'
  }).optional().or(z.literal('')).transform((value) => (value ? value : undefined)),
  phoneCountryCode: z.string().trim().regex(/^\+[0-9]{1,6}$/, {
    message: 'Country code must start with + followed by up to 6 digits'
  }).optional().default('+420'),
  dateOfBirth: z.string().trim().min(1, 'Date of birth is required').transform((value, ctx) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid date',
        path: ['dateOfBirth']
      });
      return z.NEVER;
    }

    if (parsed > new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Date of birth cannot be in the future',
        path: ['dateOfBirth']
      });
      return z.NEVER;
    }

    return parsed;
  }),
  nationality: isoAlpha3Schema,
  citizenship: optionalIsoAlpha3Schema,
  residenceCountry: isoAlpha3Schema,
  residenceCity: z.string().trim().min(1, 'Residence city is required').max(64),
  residenceAddress: z.string().trim().min(1, 'Residence address is required').max(128),
  purposeOfStay: z.string().trim().regex(/^\d{2}$/, { message: 'Use a two-digit purpose of stay code' }).transform((value) => value.padStart(2, '0')),
  documentType: z.string().trim().min(1, 'Document type is required').transform((value) => value.toUpperCase()),
  documentNumber: z.string().trim().transform((value) => value.toUpperCase()).refine((value) => DOCUMENT_NUMBER_REGEX.test(value), {
    message: 'Document number must be 4-30 characters (letters and numbers only)'
  }),
  visaNumber: z.string().trim().max(15).optional().or(z.literal('')).transform((value) => {
    if (!value) {
      return undefined;
    }
    return value.toUpperCase();
  }),
  notes: z.string().trim().max(255).optional().or(z.literal('')).transform((value) => (value ? value : undefined))
}).transform((guest) => ({
  ...guest,
  citizenship: guest.citizenship ?? guest.nationality,
  phoneCountryCode: guest.phoneCountryCode && guest.phoneCountryCode !== '' ? guest.phoneCountryCode : '+420'
})).refine((guest) => {
  if (guest.documentNumber === 'INPASS' && !guest.notes) {
    return false;
  }
  return true;
}, {
  message: 'Notes are required when using INPASS',
  path: ['notes']
});

export type GuestSubmission = z.infer<typeof guestSchema>;
