import { Reader } from '@maxmind/geoip2-node';
import fs from 'fs';
import path from 'path';

// Use both City and Anonymous IP databases
const DB_PATHS = {
  city: path.join('/tmp', 'GeoLite2-City.mmdb'),
  anonymous: path.join('/tmp', 'GeoLite2-Anonymous-IP.mmdb')
};

let readers = {
  city: null as Reader | null,
  anonymous: null as Reader | null
};

export async function initDB() {
  // Download both databases in parallel
  await Promise.all([
    downloadDB('city'),
    downloadDB('anonymous')
  ]);

  readers = {
    city: await Reader.open(DB_PATHS.city),
    anonymous: await Reader.open(DB_PATHS.anonymous)
  };
}

async function downloadDB(type: keyof typeof DB_PATHS) {
  if (fs.existsSync(DB_PATHS[type])) return;
  
  const edition = type === 'city' ? 'GeoLite2-City' : 'GeoLite2-Anonymous-IP';
  const url = `https://download.maxmind.com/app/geoip_download?edition_id=${edition}&license_key=${process.env.MAXMIND_KEY}&suffix=tar.gz`;
  
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(DB_PATHS[type], Buffer.from(buffer));
}

export function analyzeIP(ip: string) {
  if (!readers.city || !readers.anonymous) {
    throw new Error('Databases not loaded');
  }

  // Get standard geo data
  const cityData = readers.city.city(ip);
  
  // Get advanced threat data
  const anonymousData = readers.anonymous.anonymousIp(ip);

  return {
    ip,
    country: cityData.country?.isoCode,
    city: cityData.city?.names?.en,
    
    // Threat detection
    isVPN: anonymousData?.isAnonymousVpn || false,
    isTor: anonymousData?.isTorExitNode || false,
    isProxy: anonymousData?.isPublicProxy || false,
    isHosting: anonymousData?.isHostingProvider || false,
    
    // Additional metadata
    network: cityData.traits?.network,
    riskScore: calculateRiskScore(anonymousData)
  };
}

function calculateRiskScore(data: any): number {
  let score = 0;
  if (data?.isAnonymousVpn) score += 0.7;
  if (data?.isTorExitNode) score += 0.9;
  if (data?.isPublicProxy) score += 0.6;
  if (data?.isHostingProvider) score += 0.3;
  return Math.min(score, 1.0);
}