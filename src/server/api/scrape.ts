import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

// Elements to completely remove
const ELEMENTS_TO_REMOVE = [
  'script',
  'style',
  'noscript',
  'iframe',
  'nav',
  'footer',
  'header',
  'aside',
  '.ltx_bibliography',
  '[class*="bibliography"]',
  '[id*="bibliography"]',
  'meta',
  'link',
  'head',
  '.advertisement',
  '.social-share',
  '.related-articles'
];

// Academic elements to preserve with special handling
const ACADEMIC_ELEMENTS = {
  math: ['math', '.math', '[class*="math"]', '.MathJax', '[class*="formula"]'],
  figures: ['figure', '.figure', '[class*="figure"]', '.chart', '.diagram'],
  tables: ['table', '.table', '[class*="table"]'],
  equations: ['.equation', '[class*="equation"]'],
  formulas: ['.formula', '[class*="formula"]'],
  theorems: ['.theorem', '[class*="theorem"]', '.lemma', '.proof'],
  definitions: ['.definition', '[class*="definition"]'],
  algorithms: ['.algorithm', '[class*="algorithm"]', '.pseudocode'],
  citations: ['.citation', '[class*="citation"]', '.reference:not([class*="bibliography"])']
};

// Structure elements to preserve
const STRUCTURE_ELEMENTS = [
  'article',
  'section',
  'main',
  'div[class]',
  'div[id]',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'abstract',
  '.abstract',
  '[class*="abstract"]'
];

router.post('/', async (req, res) => {
  try {
    const { url, include_html = false } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL is required' 
      });
    }

    console.log('\n=== Attempting to scrape URL ===');
    console.log('URL:', url);
    console.log('Time:', new Date().toISOString());

    const response = await axios.get(url);
    
    if (!response.data) {
      return res.status(500).json({
        success: false,
        error: 'No data received from URL'
      });
    }

    try {
      const $ = cheerio.load(response.data);

      // Remove unwanted elements
      ELEMENTS_TO_REMOVE.forEach(selector => {
        $(selector).remove();
      });

      // Special handling for academic elements
      Object.entries(ACADEMIC_ELEMENTS).forEach(([type, selectors]) => {
        selectors.forEach(selector => {
          $(selector).each((_, elem) => {
            const $elem = $(elem);
            // Preserve the original content but add semantic markers
            const content = $elem.html() || $elem.text();
            $elem.attr('data-content-type', type);
            
            // Special handling for different types
            switch(type) {
              case 'math':
                // Preserve LaTeX and MathML
                if ($elem.find('annotation-xml[encoding="MathML"]').length) {
                  $elem.attr('data-format', 'mathml');
                } else if ($elem.text().includes('\\')) {
                  $elem.attr('data-format', 'latex');
                }
                break;
              case 'figures':
                // Preserve figure captions and descriptions
                const caption = $elem.find('figcaption').text();
                const alt = $elem.find('img').attr('alt');
                if (caption) $elem.attr('data-caption', caption);
                if (alt) $elem.attr('data-description', alt);
                break;
              case 'tables':
                // Preserve table captions
                const tableCaption = $elem.find('caption').text();
                if (tableCaption) $elem.attr('data-caption', tableCaption);
                break;
            }
          });
        });
      });

      // Clean and preserve structure
      STRUCTURE_ELEMENTS.forEach(selector => {
        $(selector).each((_, elem) => {
          const $elem = $(elem);
          // Remove all attributes except the ones we want to keep
          const attrsToKeep = ['class', 'id', 'data-content-type', 'data-format', 'data-caption', 'data-description'];
          const attrs = $elem.attr() || {};
          Object.keys(attrs).forEach(attr => {
            if (!attrsToKeep.includes(attr)) {
              $elem.removeAttr(attr);
            }
          });
        });
      });

      // Get main content, prioritizing article content
      let mainContent = $('article, main, [role="main"], .content, #content').first();
      if (!mainContent.length) {
        mainContent = $('body');
      }

      // Clean text while preserving structure
      const content = mainContent
        .text()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();

      console.log('\n=== Successfully Scraped Content ===');
      console.log('Content length:', content.length);
      console.log('Content preview:', content.slice(0, 200));

      return res.json({
        success: true,
        content,
        html: include_html ? mainContent.html() : undefined
      });

    } catch (cheerioError) {
      console.error('HTML Parsing Error:', cheerioError);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse HTML content'
      });
    }

  } catch (error) {
    console.error('\n=== Scraping Error ===');
    console.error('Failed URL:', req.body.url);
    console.error('Error:', error);

    if (axios.isAxiosError(error)) {
      return res.status(error.response?.status || 500).json({
        success: false,
        error: `Failed to fetch URL: ${error.message}`
      });
    }

    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to scrape website'
    });
  }
});

export default router; 