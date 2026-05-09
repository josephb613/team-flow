import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { withErrorHandler, validateBody } from "@/lib/api-utils";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").max(100),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export const POST = withErrorHandler(async (request: Request) => {
  const body = await request.json();

  const validation = validateBody(registerSchema, body);
  if (validation.error) return validation.error;

  const { email, name, password } = validation.data;

  // Check if user already exists
  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const hashedPassword = hashPassword(password);

  const user = await db.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: "member",
      status: "online",
    },
  });

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;

  return NextResponse.json(
    { message: "Account created successfully", user: userWithoutPassword },
    { status: 201 },
  );
});
