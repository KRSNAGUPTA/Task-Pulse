import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";

export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = verifyToken(token);

        if (decoded.type !== "access") {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            orgId: decoded.orgId,
            role: decoded.role,
        };
        next();
    } catch (error) {
        res.status(401).json({ message: "Unauthorized" });
    }
}