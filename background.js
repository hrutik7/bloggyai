let recognition = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'START_SPEECH') {
    startSpeechRecognition();
  } else if (request.type === 'STOP_SPEECH') {
    stopSpeechRecognition();
  }
});

function startSpeechRecognition() {
  if (!recognition) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

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
      chrome.runtime.sendMessage({
        type: 'SPEECH_END'
      });
    };
  }

  recognition.start();
}

function stopSpeechRecognition() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
} 