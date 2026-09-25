import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { readState, writeState } from '../../lib/orderStore';

function requiresAuthentication() {
  return process.env.NODE_ENV === 'production' || process.env.REQUIRE_SWAG_AUTH === 'true';
}

async function authorize(req, res) {
  if (!requiresAuthentication()) return true;
  const session = await getServerSession(req, res, authOptions);
  if (session) return true;
  res.status(401).json({ error: 'Enter the shared tracker password to use the tracker.' });
  return false;
}

export default async function handler(req, res) {
  try {
    if (!(await authorize(req, res))) return;
    if (req.method === 'GET') {
      const state = await readState();
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(state);
      return;
    }
    if (req.method === 'PUT') {
      const baseRevision = Number(req.body?.baseRevision);
      if (!Number.isInteger(baseRevision) || baseRevision < 0) {
        res.status(400).json({ error: 'A valid base revision is required.' });
        return;
      }
      const result = await writeState(baseRevision, req.body);
      if (result.conflict) {
        res.status(409).json({ error: 'This tracker changed in another session. Refresh before saving again.', ...result.state });
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(result.state);
      return;
    }
    res.setHeader('Allow', 'GET, PUT');
    res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Swag tracker persistence error', error);
    res.status(500).json({ error: 'The tracker data could not be loaded or saved.' });
  }
}
