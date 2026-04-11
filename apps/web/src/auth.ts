import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.NODE_ENV !== "production",
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/sign-in"
  },
  providers: [
    Credentials({
      name: "Workspace Access",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Access Code", type: "password" }
      },
      authorize: async (credentials) => {
        const { getDb } = await import("@/server/db");
        const { loadWorkspaceEnv } = await import("@/server/env");

        loadWorkspaceEnv();

        const email = credentials?.email?.toString().trim().toLowerCase() ?? "";
        const password = credentials?.password?.toString() ?? "";
        const allowedEmail = (process.env.DEFAULT_USER_EMAIL ?? "hayden@example.com").trim().toLowerCase();

        if (!email || !password) {
          return null;
        }

        if (email !== allowedEmail) {
          return null;
        }

        const expectedPassword = process.env.AUTH_DEMO_PASSWORD ?? "hayden-workstation";
        if (password !== expectedPassword) {
          return null;
        }

        const db = getDb();
        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true
          }
        });

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email ?? token.email;
        token.name = user.name ?? token.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    }
  }
});
