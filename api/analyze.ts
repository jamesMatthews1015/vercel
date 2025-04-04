import { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeIP, initDB } from '../../lib/maxmind';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Lazy-load databases
    await initDB();
    
    // Get IP from query param, headers, or connection
    const ip = req.query.ip?.toString() || 
               req.headers['x-forwarded-for']?.split(',')[0].trim() || 
               req.socket.remoteAddress;

    if (!ip) {
      return res.status(400).json({ error: "IP address required" });
    }

    const result = analyzeIP(ip);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    
    res.json({
      ...result,
      threatSummary: getThreatSummary(result)
    });
    
  } catch (error) {
    console.error('Analysis failed:', error);
    res.status(500).json({ error: "IP analysis failed" });
  }
}

function getThreatSummary(data: any): string {
  if (data.isTor) return "TOR Exit Node";
  if (data.isVPN) return "Commercial VPN";
  if (data.isProxy) return "Public Proxy";
  if (data.isHosting) return "Hosting Provider";
  return "Clean";
}