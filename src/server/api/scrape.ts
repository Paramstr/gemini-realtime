import express from 'express';
import axios from 'axios';
import cheerio from 'cheerio';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { url, include_html = false } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL is required' 
      });
    }

    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Remove script and style tags for cleaner text content
    $('script, style').remove();
    
    // Get text content
    const content = $('body').text().trim()
      .replace(/\s+/g, ' ');

    res.json({
      success: true,
      content,
      html: include_html ? response.data : undefined
    });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to scrape website'
    });
  }
});

export default router; 