    import {describe, expect, it} from "vitest"
    import { generateToken, verifyToken } from "../jwt"

    describe("Test JWT",()=>{
        it("JWT Utility", async()=>{
            const payLoad = {
                email:"user@test.com",
                userId:"1763236"
            }
            const token  = generateToken(payLoad, 60*15);
            expect(verifyToken(token)).toMatchObject(payLoad)
        })
    })