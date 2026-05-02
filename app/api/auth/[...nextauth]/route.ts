import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { supabase } from "@/lib/supabase";

type UserRow = {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email);
        const password = String(credentials.password);

        const { data: user } = await supabase.from("users").select("*").eq("email", email).single();

        if (!user) return null;

        const row = user as UserRow;

        const passwordMatch = await bcrypt.compare(password, row.password);
        if (!passwordMatch) return null;

        return {
          id: row.id,
          email: row.email,
          name: `${row.first_name} ${row.last_name}`.trim(),
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export const { GET, POST } = handlers;
