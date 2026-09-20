'use server'
import {email, z} from "zod"

const emailRegEx ='^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

const loginSchema = z.object({
    email: z.string().trim().lowercase().regex(new RegExp(emailRegEx)),
    password: z.string().trim().min(6, "Password must be 6 char at least")
})

const signUpSchema = z.object({
    name: z.string().trim(),
    email: z.string().trim().lowercase().regex(new RegExp(emailRegEx)),
    password: z.string().trim().min(6, 'password must be 6 chars at least')
})


export async function login(formData:FormData) {

    const res = loginSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password")
    })

    if(!res || !res?.data){
        return { error: "Invalid email or password"};
    }

    const response = await fetch(`${process.env.API_GATEWAY}/api/auth/login`,{
        method: 'POST',
        headers: {
            'Content-Type':'application/json'
        },
        body: JSON.stringify(res.data),
        cache:'no-store'
    })
    if(response.status === 500){
        return {
            error: 'Internal Server Error'
        }
    }
    if(!response.ok){
        return {
            error: "Failed to login, please check email or password is correct"
        }
    }

    const {accessToken , refreshToken}
    
}