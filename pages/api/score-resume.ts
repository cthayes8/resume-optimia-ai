import { type NextApiRequest, type NextApiResponse } from 'next';
import { scoreResumeSections } from '../../server/key-metrics-api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobDescription, resumeContent } = req.body;

    if (!jobDescription || !resumeContent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await scoreResumeSections(jobDescription, resumeContent);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error scoring resume:', error);
    return res.status(500).json({ error: 'Failed to score resume' });
  }
} 