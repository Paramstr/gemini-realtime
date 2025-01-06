import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useState, memo } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";
import './WebScraper.scss';

const declaration: FunctionDeclaration = {
  name: "scrape_website",
  description: "Scrapes the contents of a website and returns the HTML content.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      url: {
        type: SchemaType.STRING,
        description: "The URL of the website to scrape",
      },
      include_html: {
        type: SchemaType.BOOLEAN,
        description: "Whether to include the full HTML content"
      }
    },
    required: ["url"],
  },
};

interface WebScraperProps {
  onNewContent: (content: string, url: string) => void;
}

function WebScraperComponent({ onNewContent }: WebScraperProps) {
  const { client, setConfig } = useLiveAPIContext();
  const [scrapedContent, setScrapedContent] = useState<string>("");

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: 'When a website URL is provided, immediately scrape it using the "scrape_website" function and return the content without additional dialogue. Only scrape when a URL is explicitly given.',
          },
        ],
      },
      tools: [
        { functionDeclarations: [declaration] },
      ],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = async (toolCall: ToolCall) => {
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name,
      );
      
      if (fc) {
        const { url, include_html = false } = fc.args as any;
        
        try {
          const response = await fetch('/api/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, include_html }),
          });
          
          const data = await response.json();
          
          if (!data.success) {
            console.error('Scraping failed:', data.error);
            client.sendToolResponse({
              functionResponses: [{
                response: { 
                  output: { 
                    success: false,
                    error: data.error || 'Failed to scrape website'
                  } 
                },
                id: fc.id,
              }],
            });
            return;
          }

          setScrapedContent(data.content);
          onNewContent(data.content, url);
          
          client.sendToolResponse({
            functionResponses: [{
              response: { 
                output: { 
                  success: true,
                  html: data.html,
                  content: data.content
                } 
              },
              id: fc.id,
            }],
          });
        } catch (error) {
          console.error('Scraping failed:', error);
          client.sendToolResponse({
            functionResponses: [{
              response: { 
                output: { 
                  success: false,
                  error: error instanceof Error ? error.message : 'Failed to scrape website'
                } 
              },
              id: fc.id,
            }],
          });
        }
      }
    };

    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  return (
    <div className="scraped-content">
      {scrapedContent && (
        <div className="content-preview">
          <h3>Scraped Content Preview</h3>
          <div 
            className="html-preview" 
            style={{
              maxHeight: '500px',
              overflow: 'auto',
              border: '1px solid #ccc',
              padding: '10px'
            }}
          >
            <pre>{scrapedContent.slice(0, 10000)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export const WebScraper = memo(WebScraperComponent); 