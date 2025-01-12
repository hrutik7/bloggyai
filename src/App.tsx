import { useState, useEffect } from 'react';
import GeminiStreamChat from './GeminiStreamChat';
import Onboarding from './onboarding';
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

interface UserData {
  username: string;
  email: string;
  password: string;
  apiKey: string;
}

function App() {
  const [scrapedData, setScrapedData] = useState<ScrapedData[]>([]);
  const [error, setError] = useState<string>('');
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    // Check for existing user data in storage
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      setUserData(JSON.parse(storedUser));
    }
  }, []);

  const handleOnboardingComplete = (data: UserData) => {
    setUserData(data);
    localStorage.setItem('userData', JSON.stringify(data));
  };

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

  if (!userData) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="scraper-extension w-[100%] text-center px-10">
      <div className="flex justify-between items-center mb-4">
        <h1>GoroAI 🤖</h1>
        <div className="text-sm text-gray-600">
          Welcome, {userData.username} 👋
        </div>
      </div>
      
      <p className='py-3 font-bold text-gray-400'>
        Your Curiosity Companion 🧠 - Explore & Learn with AI! ✨
      </p>

      <button onClick={handleScrapeClick} className="scrape-button bg-blue-500">
        Start 
      </button>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-10 p-4">
        <div className="chat-section">
          {scrapedData.length > 0 ? (
            <GeminiStreamChat scrapedData={scrapedData} apiKey={userData.apiKey} />
          ) : (
            <div className="no-data-message">
              click on start 🏃‍➡️
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;