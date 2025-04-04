import { VercelRequest, VercelResponse } from '@vercel/node';
import { initDB } from '../../lib/maxmind';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await initDB(true); // Force fresh download
    res.status(200).send('Databases updated successfully');
  } catch (error) {
    console.error('Update failed:', error);
    res.status(500).send('Database update failed');
  }
}