import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "crypto";
import { db } from "./db";

const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === "production"
    ? ""
    : "teamflow-dev-secret-change-in-production");

if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET environment variable must be set in production",
  );
}

function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, key] = hashedPassword.split(":");
  if (!salt || !key) return false;
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return key === derivedKey.toString("hex");
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("Aucun compte trouvé avec cet email");
        }

        if (!user.password) {
          throw new Error(
            "Ce compte n'a pas de mot de passe. Utilisez la connexion sociale ou réinitialisez votre mot de passe.",
          );
        }

        const isPasswordValid = verifyPassword(
          credentials.password,
          user.password,
        );

        if (!isPasswordValid) {
          throw new Error("Mot de passe incorrect");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role =
          (token.role as string) || "member";
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: NEXTAUTH_SECRET,
};
