import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if running from root or voice dir
    let baseDir = process.cwd();
    if (baseDir.endsWith('/voice')) {
      baseDir = path.join(baseDir, '..');
    }
    const brainPath = path.join(baseDir, 'brain', 'demo_brain.json');
    
    if (!fs.existsSync(brainPath)) {
      return res.status(404).json({ error: 'Demo brain file not found' });
    }

    const brainData = JSON.parse(fs.readFileSync(brainPath, 'utf8'));
    
    const learnerProfile = {
      ...brainData.brain.high_level.onboarding,
      ...brainData.brain.high_level.profiling,
      onboarding_summary: brainData.brain.high_level.onboarding.summary
    };

    // Return ONLY the profile, so the client can trigger generation
    return res.status(200).json({
      learnerProfile: learnerProfile
    });

  } catch (error) {
    console.error('Demo load error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
