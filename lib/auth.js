import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Swag Tracker Password',
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const configuredPassword = process.env.SWAG_TRACKER_PASSWORD;
        if (!configuredPassword || !credentials?.password || credentials.password !== configuredPassword) return null;
        return { id: 'swag-tracker-user', name: 'Swag Tracker User' };
      },
    }),
  ],
  callbacks: {
    async session({ session }) {
      return session;
    },
  },
};
