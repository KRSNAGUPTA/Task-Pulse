import { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { generateToken } from "../utils/jwt.js";

export async function register(req: Request, res: Response): Promise<void> {
  // console.log("Received Registraion")
  try {
    const { name, email, password } = req.body || {};

    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    const trimmedPassword = typeof password === "string" ? password.trim() : "";

    if (!trimmedEmail || !trimmedPassword) {
      res.status(400).json({
        message: "Email and Password are required",
      });
      return;
    }

    if (trimmedPassword.length < 8) {
      res.status(400).json({
        message: "Password should be at least 8 characters",
      });
      return;
    }

    const alreadyUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (alreadyUser) {
      res.status(409).json({
        message: "User already exists, try logging in",
      });
      return;
    }

    const hashedPass = await hashPassword(trimmedPassword);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: trimmedEmail,
        password: hashedPass,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    const accessToken = generateToken(
      { email: newUser.email, userId: newUser.id },
      "15m"
    );
    const refreshToken = generateToken(
      { email: newUser.email, userId: newUser.id },
      "7d"
    );

    res.cookie("RefreshToken", refreshToken, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true,
    });

    res.status(201).json({
      user: newUser,
      token: { accessToken },
    });
  } catch (error: any) {
    console.error("Error while registering user:", error?.message || error);
    res.status(500).json({
      message: "Internal server error during registration",
    });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body || {};
    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    const trimmedPassword = typeof password === "string" ? password.trim() : "";

    if (!trimmedEmail || !trimmedPassword) {
      res.status(400).json({
        message: "Email and Password required",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      res.status(401).json({
        message: "Invalid email or password",
      });
      return;
    }

    const verifyPassword = await comparePassword(trimmedPassword, user.password);
    if (!verifyPassword) {
      res.status(401).json({
        message: "Invalid email or password",
      });
      return;
    }

    const accessToken = generateToken(
      { userId: user.id, email: user.email },
      "15m"
    );
    const refreshToken = generateToken(
      { userId: user.id, email: user.email },
      "7d"
    );

    res.cookie("RefreshToken", refreshToken, {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    });

    res.status(200).json({
      user: { id: user.id, email: user.email },
      token: { accessToken },
    });
  } catch (error: any) {
    console.error("Error while login", error?.message || error);
    res.status(500).json({
      message: "Internal server error during login",
    });
  }
}