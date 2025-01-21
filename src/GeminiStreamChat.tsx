import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Mic, MicOff, Send } from 'lucide-react';

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  emma?: any;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: Event) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
  prototype: SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

// Component props interface
interface Props {
  scrapedData: any[];
  apiKey: string;
}

const GeminiStreamChat: React.FC<Props> = ({ scrapedData, apiKey }) => {
  const [messages, setMessages] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [askingPermission, setAskingPermission] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(() => {
          console.log('Microphone permission granted');
          startSpeechRecognition();
        })
        .catch((error) => {
          console.error('Microphone permission denied:', error);
        });

      const startSpeechRecognition = () => {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
          console.error('SpeechRecognition API not supported in this browser.');
          return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => console.log('Speech recognition started.');
        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join('');
          console.log('Transcript:', transcript);
        };
        recognition.onerror = (event:any) => {
          if (event.error === 'network') {
            console.error('Network error: Check your internet connection or try deploying to a secure domain.');
            alert('Speech recognition failed due to a network issue. Please check your internet connection.');
          } else {
            console.error('Speech recognition error:', event.error);
            alert(`Speech recognition error: ${event.error}`);
          }
          setIsListening(false);
        };
        

        recognition.start();
      };

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join('');
        setInputMessage(transcript);
      };

      recognitionInstance.onerror = (event:any) => {
        if (event.error === 'network') {
          console.error('Network error: Check your internet connection or try deploying to a secure domain.');
          alert('Speech recognition failed due to a network issue. Please check your internet connection.');
        } else {
          console.error('Speech recognition error:', event.error);
          alert(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const generateGeminiResponse = async (userInput: string, allowOutOfContext = false) => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const context = scrapedData[0];
      const formattedContent = [
        ...context.paragraphs,
        ...context.lists.map((item: string) => `• ${item}`)
      ].join('\n\n');

      if (!allowOutOfContext) {
        const contextCheckPrompt = `
          Context: ${formattedContent}
          Question: ${userInput}
          Task: Determine if this question can be answered using ONLY the provided context.
          Reply with just 'yes' or 'no'.
        `;
        const contextCheck = await model.generateContent(contextCheckPrompt);
        const isInContext = contextCheck.response.text().toLowerCase().includes('yes');

        if (!isInContext) {
          setMessages((prev) => [
            ...prev,
            `You: ${userInput}`,
            "AI: This question appears to be outside the context of the current page. Would you like me to answer it using my general knowledge? (Reply with 'yes' or 'no')"
          ]);
          setAskingPermission(true);
          setPendingQuestion(userInput);
          setIsLoading(false);
          return;
        }
      }

      const prompt = allowOutOfContext
        ? `Question: ${userInput}\nPlease provide a comprehensive and helpful response.`
        : `
          Context:
          ${formattedContent}

          Question: ${userInput}

          Instructions:
          1. Answer based ONLY on the provided context.
          2. Use markdown for readability.
          3. Keep the response concise but informative.
        `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setMessages((prev) => [...prev, `You: ${userInput}`, `AI: ${text}`]);
      setInputMessage('');
      setAskingPermission(false);
      setPendingQuestion('');
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages((prev) => [
        ...prev,
        'Error: Failed to generate response. Please try again.'
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    if (isListening) {
      toggleListening();
    }

    if (askingPermission) {
      const response = inputMessage.toLowerCase();
      if (response === 'yes') {
        generateGeminiResponse(pendingQuestion, true);
      } else if (response === 'no') {
        setMessages((prev) => [
          ...prev,
          `You: ${inputMessage}`,
          "AI: Okay, I'll stick to answering questions about the page content only."
        ]);
        setAskingPermission(false);
        setPendingQuestion('');
      }
    } else {
      generateGeminiResponse(inputMessage);
    }
    setInputMessage('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                message.startsWith('You:')
                  ? 'bg-blue-100 ml-auto max-w-[80%]'
                  : 'bg-gray-100 mr-auto max-w-[80%]'
              }`}
            >
              {message}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-full ${
                isListening ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}
              disabled={isLoading}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                isListening
                  ? 'Listening...'
                  : askingPermission
                  ? "Reply with 'yes' or 'no'"
                  : 'Type or use voice input...'
              }
              disabled={isLoading}
              className="flex-1 p-2 border border-gray-300 rounded-lg"
            />
            <button
              type="submit"
              disabled={isLoading || (!inputMessage.trim() && !isListening)}
              className={`p-2 rounded-full ${
                isLoading
                  ? 'bg-gray-300 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white'
              }`}
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GeminiStreamChat;
