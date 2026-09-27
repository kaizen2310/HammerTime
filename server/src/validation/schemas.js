import { z } from 'zod'

export const registerSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export const createAuctionSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  startingPrice: z.coerce.number().positive('Starting price must be greater than 0'),
  endsAt: z.string().refine((val) => {
    const date = new Date(val)
    return !isNaN(date.getTime()) && date.getTime() > Date.now()
  }, 'End time must be a valid date in the future'),
})