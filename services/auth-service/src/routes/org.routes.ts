import { Router } from "express";
import { createOrg, getOrgMembers, addMember, getOrgMembersInternal } from "../controllers/org.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/internal/:orgId/members", getOrgMembersInternal);

// All org routes require authentication
router.use(authenticateUser);
router.post("/", createOrg);
router.get("/:orgId/members", getOrgMembers);
router.post("/:orgId/members", addMember);
export default router;