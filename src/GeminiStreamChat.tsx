import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
// import process from 'process';

interface Props {
  scrapedData: any[];
}

const GeminiStreamChat: React.FC<Props> = ({ scrapedData }) => {
  const [messages, setMessages] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [askingPermission, setAskingPermission] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState('');
  
  const generateGeminiResponse = async (userInput: string, allowOutOfContext = false) => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const genAI = new GoogleGenerativeAI('AIzaSyDDwXcjyUFLYM-kAqv4A2JJEECLGRIr29g');
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const context = scrapedData[0];
      // Combine all content with proper formatting
      const formattedContent = [
        ...context.paragraphs,
        ...context.lists.map((item: string) => `• ${item}`)
      ].join('\n\n');

      // First, check if the question is related to the content
      if (!allowOutOfContext) {
        const contextCheckPrompt = `
          Context: ${formattedContent}...
          Question: ${userInput}
          Task: Determine if this question can be answered using ONLY the provided context.
          Reply with just 'yes' or 'no'.
        `;

        const contextCheck = await model.generateContent(contextCheckPrompt);
        const isInContext = contextCheck.response.text().toLowerCase().includes('yes');

        if (!isInContext) {
          setMessages(prev => [...prev, `You: ${userInput}`, 
            "AI: This question appears to be outside the context of the current page. Would you like me to answer it using my general knowledge? (Reply with 'yes' or 'no')"
          ]);
          setAskingPermission(true);
          setPendingQuestion(userInput);
          setIsLoading(false);
          return;
        }
      }

      // Construct the main prompt
      const prompt = allowOutOfContext 
        ? `Question: ${userInput}\nPlease provide a comprehensive and helpful response.`
        : `
          Context from the webpage:
          Title: ${context.title}
          URL: ${context.url}
          ${context.author !== 'Unknown' ? `Author: ${context.author}` : ''}
          ${context.publishDate ? `Published: ${context.publishDate}` : ''}
          
          Content:
          ${formattedContent}
          
          Question: ${userInput}
          
          Instructions:
          1. Answer based ONLY on the provided context
          2. If the answer isn't fully available in the context, say so
          3. Use markdown formatting for better readability
          4. Keep the response concise but informative
          5. If quoting from the text, use quotation marks
        `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      setMessages(prev => [...prev, `You: ${userInput}`, `AI: ${text}`]);
      setInputMessage('');
      setAskingPermission(false);
      setPendingQuestion('');
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages(prev => [...prev, 'Error: Failed to generate response. Please try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    if (askingPermission) {
      const response = inputMessage.toLowerCase();
      if (response === 'yes') {
        generateGeminiResponse(pendingQuestion, true);
      } else if (response === 'no') {
        setMessages(prev => [...prev, `You: ${inputMessage}`, "AI: Okay, I'll stick to answering questions about the page content only."]);
        setAskingPermission(false);
        setPendingQuestion('');
      }
    } else {
      generateGeminiResponse(inputMessage);
    }
    setInputMessage('');
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
          placeholder={askingPermission ? "Reply with 'yes' or 'no'" : "Ask about the content..."}
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
