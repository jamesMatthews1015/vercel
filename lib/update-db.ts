import AWS from 'aws-sdk';
import fs from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';

const s3 = new AWS.S3({
  accessKeyId: process.env.S3_KEY,
  secretAccessKey: process.env.S3_SECRET
});

export async function updateDatabase() {
  const DB_PATH = '/tmp/GeoLite2-Country.mmdb';
  
  // Download from MaxMind (requires license key)
  const response = await fetch(`https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-Country&license_key=${process.env.MAXMIND_KEY}&suffix=tar.gz`);
  
  // Extract and save to Vercel's tmp directory
  await promisify(pipeline)(
    response.body,
    fs.createWriteStream(DB_PATH)
  );

  // Optional: Upload to S3 for persistence
  await s3.upload({
    Bucket: 'your-bucket',
    Key: 'GeoLite2-Country.mmdb',
    Body: fs.createReadStream(DB_PATH)
  }).promise();
}