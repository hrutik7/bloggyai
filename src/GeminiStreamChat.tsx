import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Props {
  scrapedData: any[];
}

const GeminiStreamChat: React.FC<Props> = ({ scrapedData }) => {
  const [messages, setMessages] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateGeminiResponse = async (userInput: string) => {
    if (isLoading) return; // Prevent multiple calls while loading

    try {
      setIsLoading(true);
      const genAI = new GoogleGenerativeAI('AIzaSyDDwXcjyUFLYM-kAqv4A2JJEECLGRIr29g');
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const context = scrapedData[0];
      const prompt = `
        Context from the webpage:
        Title: ${context.title}
        Content: ${context.paragraphs.join(' ')}
        Lists: ${context.lists.join(' ')}
        
        User Question: ${userInput}
        
        Please provide a helpful response based on the webpage content.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      setMessages(prev => [...prev, `You: ${userInput}`, `AI: ${text}`]);
      setInputMessage('');
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages(prev => [...prev, 'Error: Failed to generate response']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !isLoading) {
      generateGeminiResponse(inputMessage);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages-container">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.startsWith('You:') ? 'user-message' : 'ai-message'}`}
          >
            {message}
          </div>
        ))}
        {isLoading && (
          <div className="loading-indicator">
            <div className="loading-spinner"></div>
            <span>AI is thinking...</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask about the content..."
          disabled={isLoading}
          className="chat-input"
        />
        <button 
          type="submit" 
          disabled={isLoading || !inputMessage.trim()}
          className="send-button"
        >
          {isLoading ? 'Generating...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default GeminiStreamChat;
