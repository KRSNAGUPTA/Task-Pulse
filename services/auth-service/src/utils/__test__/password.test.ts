import {describe, it, expect} from "vitest"
import { hashPassword, comparePassword } from "../password.js"

describe("Password utility", ()=>{
    it('should has and compare password correctly',async()=>{
        const password  = "randomPassword"
        const hashedPass = await hashPassword(password);
        expect(await comparePassword(password, hashedPass)).toBe(true);
        expect(await comparePassword("wrongPass", hashedPass)).toBe(false)
    })
})
