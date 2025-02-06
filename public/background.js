let recognition;

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed.');
});

// Start speech recognition
function startRecognition() {
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    console.log('Speech recognition started.');
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join('');
    console.log('Transcript:', transcript);

    // Send the transcript to the popup or content script
    chrome.runtime.sendMessage({ type: 'transcript', data: transcript });
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
  };

  recognition.onend = () => {
    console.log('Speech recognition ended.');
  };

  recognition.start();
}

// Stop speech recognition
function stopRecognition() {
  if (recognition) {
    recognition.stop();
  }
}

// Listen for messages from the popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'start') {
    startRecognition();
  } else if (request.type === 'stop') {
    stopRecognition();
  }
});