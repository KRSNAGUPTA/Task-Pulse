import { Router } from "express";
import { login, logout, me, refresh, register } from "../controllers/auth.controller";
import { authenticateUser } from "../middlewares/auth.middleware";


const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout)
router.post("/refresh", refresh)
router.get("/me", authenticateUser, me)

export default router;