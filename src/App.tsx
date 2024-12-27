import { useState, useEffect } from 'react';
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
  const ITEMS_PER_ROW = 3;

  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === 'SCRAPED_DATA') {
        setScrapedData(prevData => [...prevData, message.data]);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const handleScrapeClick = async () => {
    console.log(scrapedData[0]?.paragraphs.join(),"LLLLLLLLLLLLLLLLLLLLLL")
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

  const renderContentGrid = (data: ScrapedData) => {
    const allContent = [...data.paragraphs, ...data.lists];
    const rows = Math.ceil(allContent.length / ITEMS_PER_ROW);
    
    return Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={rowIndex}>
        {Array.from({ length: ITEMS_PER_ROW }).map((_, colIndex) => {
          const contentIndex = rowIndex * ITEMS_PER_ROW + colIndex;
          const content = allContent[contentIndex];
          
          return (
            <td key={colIndex} className="content-cell">
              {content || ''}
            </td>
          );
        })}
      </tr>
    ));
  };

  return (
    <div className="scraper-extension">
      <h1>Web Scraper</h1>
      
      <button onClick={handleScrapeClick} className="scrape-button">
        Scrape This Page
      </button>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="table-container">
        {scrapedData.map((data, index) => (
          <div key={index} className="scraped-section">
            <h2>{data.title}</h2>
            <div className="metadata">
              <span>Author: {data.author || 'N/A'}</span>
              <span>Published: {data.publishDate ? new Date(data.publishDate).toLocaleDateString() : 'N/A'}</span>
              <a href={data.url} target="_blank" rel="noopener noreferrer">View Source</a>
            </div>
            
            <table className="content-table">
              <tbody>
                {renderContentGrid(data)}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;