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
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);

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

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream after getting permission
      setMicPermissionGranted(true);
      return true;
    } catch (err) {
      console.error('Microphone permission error:', err);
      setError('Please allow microphone access to use voice input.');
      return false;
    }
  };

  const handleScrapeClick = async () => {
    try {
      setError('');
      
      // First request microphone permission
      const permissionGranted = await requestMicrophonePermission();
      if (!permissionGranted) {
        throw new Error('Microphone permission is required for voice input');
      }

      // Get the active tab
      const [tab] = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true 
      });
      
      if (!tab?.id) {
        throw new Error('No active tab found');
      }

      // Execute content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // Send message to start scraping
      await chrome.tabs.sendMessage(tab.id, { type: 'START_SCRAPING' });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
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

      <button 
        onClick={handleScrapeClick} 
        className={`scrape-button ${micPermissionGranted ? 'bg-green-500' : 'bg-blue-500'}`}
      >
        {micPermissionGranted ? 'Start with Voice 🎤' : 'Start'} 
      </button>

      {error && (
        <div className="error-message text-red-500 mt-2">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-10 p-4">
        <div className="chat-section">
          {scrapedData.length > 0 ? (
            <GeminiStreamChat 
              scrapedData={scrapedData} 
              apiKey={userData.apiKey}
              micPermissionGranted={micPermissionGranted}
            />
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