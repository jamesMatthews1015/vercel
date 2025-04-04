import { Reader } from '@maxmind/geoip2-node';
import { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

let lookup: Reader;

async function initDatabase() {
  const DB_PATH = path.join('/tmp', 'GeoLite2-Country.mmdb');
  
  if (!fs.existsSync(DB_PATH)) {
    // Fallback to S3 if missing
    const s3 = new AWS.S3();
    const data = await s3.getObject({
      Bucket: 'your-bucket',
      Key: 'GeoLite2-Country.mmdb'
    }).promise();
    
    fs.writeFileSync(DB_PATH, data.Body as Buffer);
  }

  lookup = await Reader.open(DB_PATH);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Lazy-load database
  if (!lookup) await initDatabase();

  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    if (!ip) throw new Error('No IP detected');

    const result = lookup.country(ip);
    res.json({
      country: result.country?.isoCode,
      isProxy: result.traits?.isAnonymousProxy
    });
  } catch (error) {
    res.status(500).json({ error: 'Geolocation failed' });
  }
}