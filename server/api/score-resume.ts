import express from 'express';
import { scoreResumeSections } from '../key-metrics-api.js';

const router = express.Router();

router.post('/api/score-resume', async (req, res) => {
  try {
    const { jobDescription, resumeContent, keywordAnalysis } = req.body;
    
    console.log('Received request for resume scoring');
    console.log('Job Description length:', jobDescription?.length);
    console.log('Resume Content length:', resumeContent?.length);
    console.log('Keyword Analysis provided:', keywordAnalysis ? 'Yes' : 'No');

    if (!jobDescription || !resumeContent) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Starting resume scoring...');
    const result = await scoreResumeSections(jobDescription, resumeContent, keywordAnalysis);
    console.log('Scoring complete, total score:', result.totalScore);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error scoring resume:', error);
    return res.status(500).json({ 
      error: 'Failed to score resume',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 