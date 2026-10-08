import {z} from "zod"
export const loginSchema = z.object({
    email: z.string().trim().lowercase().email("Invalid email address"),
    password: z.string().trim().min(6, "Password must be at least 6 characters")
});

export const signUpSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().trim().lowercase().email("Invalid email address"),
    password: z.string().trim().min(6, "Password must be at least 6 characters")
});
