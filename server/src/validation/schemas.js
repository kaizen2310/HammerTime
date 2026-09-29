import { z } from 'zod'

export const registerSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254, 'Email is too long'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254, 'Email is too long'),
  password: z.string().min(1, 'Password is required'),
})

export const createAuctionSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  startingPrice: z.coerce.number().positive('Starting price must be greater than 0'),
  // Must carry a timezone (e.g. "2026-09-30T12:30:00.000Z"). A bare "2026-09-30T18:00"
  // would be read in the server's timezone, which differs between laptop and host.
  endsAt: z
    .iso.datetime({ offset: true, message: 'End time must be a valid date and time' })
    .refine((val) => new Date(val).getTime() > Date.now(), 'End time must be in the future'),
})

// Socket payloads skip Express middleware, so they need their own validation.
export const placeBidSchema = z.object({
  auctionId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid auction'),
  amount: z
    .number('Enter a valid amount')
    .int('Bid must be a whole number')
    .positive('Bid must be greater than 0'),
})