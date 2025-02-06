// Add listener for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Handle any background tasks that don't involve speech recognition

let recognition = null;

// Log when the background script loads
console.log('Background script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  if (request.type === 'START_SPEECH') {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      startSpeechRecognition();
    } else {
      // Try using Chrome's speech recognition API
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: initSpeechRecognition,
          });
        }
      });
    }
  } else if (request.type === 'STOP_SPEECH') {
    stopSpeechRecognition();
  }
});

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    chrome.runtime.sendMessage({
      type: 'SPEECH_ERROR',
      error: 'Speech recognition not supported'
    });
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    chrome.runtime.sendMessage({ type: 'SPEECH_START' });
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join('');
    
    chrome.runtime.sendMessage({
      type: 'SPEECH_RESULT',
      text: transcript
    });
  };

  recognition.onerror = (event) => {
    chrome.runtime.sendMessage({
      type: 'SPEECH_ERROR',
      error: event.error
    });
  };

  recognition.onend = () => {
    chrome.runtime.sendMessage({ type: 'SPEECH_END' });
  };

  recognition.start();
  return recognition;
}

function startSpeechRecognition() {
  try {
    if (!recognition) {
      recognition = initSpeechRecognition();
    } else {
      recognition.start();
    }
  } catch (error) {
    console.error('Error starting recognition:', error);
    chrome.runtime.sendMessage({
      type: 'SPEECH_ERROR',
      error: error.message
    });
  }
}

function stopSpeechRecognition() {
  if (recognition) {
    try {
      recognition.stop();
      recognition = null;
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }
} 