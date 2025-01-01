import { useState, useEffect } from 'react';
import GeminiStreamChat from './GeminiStreamChat';
import './App.css';

interface ScrapedData {
  title: string;
  url: string;
  timestamp: string;
  description: string;
  paragraphs: string[];
  lists: string[];
  author: string;
  publishDate: string;
  images: string[];
}

function App() {
  const [scrapedData, setScrapedData] = useState<ScrapedData[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === 'SCRAPED_DATA') {
        setScrapedData([message.data]);
        console.log("New data scraped, previous history cleared");
      }
    };

    chrome?.runtime?.onMessage?.addListener(messageListener);
    return () => {
      chrome?.runtime?.onMessage?.removeListener(messageListener);
    };
  }, []);

  const handleScrapeClick = async () => {
    try {
      setError('');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.id) {
        throw new Error('No active tab found');
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      await chrome.tabs.sendMessage(tab.id, { type: 'START_SCRAPING' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Scraping error:', err);
    }
  };

  return (
    <div className="scraper-extension">
      <h1>AI Web Scraper</h1>
      
      <button onClick={handleScrapeClick} className="scrape-button">
        Scrape This Page
      </button>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-10 p-4">
        {/* <div className="scraped-content">
          {scrapedData.map((data, index) => (
            <div key={index} className="scraped-section">
              <h2>{data.title}</h2>
              <div className="metadata">
                <span>Author: {data.author || 'N/A'}</span>
                <span>Published: {data.publishDate ? new Date(data.publishDate).toLocaleDateString() : 'N/A'}</span>
                <a href={data.url} target="_blank" rel="noopener noreferrer">View Source</a>
              </div>
              
              <div className="content-preview">
                <h3>Content Preview</h3>
                <p>{data.paragraphs[0]}</p>
              </div>
            </div>
          ))}
        </div> */}

        <div className="chat-section">
          {scrapedData.length > 0 ? (
            <GeminiStreamChat scrapedData={scrapedData} />
          ) : (
            <div className="no-data-message">
              Scrape a page to start chatting about its content
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;