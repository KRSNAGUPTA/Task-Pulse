import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";
export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
            message: "Unauthorized"
        })
        return;
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = verifyToken(token);
        req.user = {
            userId: decoded.userId,
            email: decoded.email
        }
        next();
    } catch (error) {
        res.status(401).json({
            message: "Unauthorized"
        })
    }

}