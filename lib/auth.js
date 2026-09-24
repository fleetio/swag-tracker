import GitHubProvider from 'next-auth/providers/github';

const allowedOrganization = () => (process.env.GITHUB_ALLOWED_ORG || 'fleetio').toLowerCase();

async function belongsToAllowedOrganization(accessToken) {
  const response = await fetch('https://api.github.com/user/orgs?per_page=100', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) return false;
  const organizations = await response.json();
  return organizations.some((organization) => organization.login?.toLowerCase() === allowedOrganization());
}

export const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      authorization: { params: { scope: 'read:user user:email read:org', prompt: 'consent' } },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      return Boolean(account?.access_token) && belongsToAllowedOrganization(account.access_token);
    },
    async session({ session, token }) {
      if (session.user && token?.login) session.user.githubLogin = token.login;
      return session;
    },
    async jwt({ token, profile }) {
      if (profile?.login) token.login = profile.login;
      return token;
    },
  },
};
