import { Router } from "express";
import { createOrg, getOrgMembers, addMember } from "../controllers/org.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = Router();

// All org routes require authentication
router.use(authenticateUser);

router.post("/", createOrg);
router.get("/:orgId/members", getOrgMembers);
router.post("/:orgId/members", addMember);

export default router;