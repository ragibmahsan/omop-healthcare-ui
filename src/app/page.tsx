'use client';

import { useState } from 'react';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import amplifyconfig from '../amplifyconfiguration.json';
import '@aws-amplify/ui-react/styles.css';

Amplify.configure(amplifyconfig);

interface Message {
  text: string;
  sender: 'user' | 'bot';
  type?: 'sql' | 'summary';
}

function ChatInterface({ user, signOut }: any) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hello! I'm your OMOP Healthcare Assistant. Ask me about patients, procedures, medications, or any healthcare data.",
      sender: 'bot'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    try {
      // Get AWS credentials from Amplify
      const session = await fetchAuthSession();
      const credentials = session.credentials;

      const lambdaClient = new LambdaClient({
        region: "us-east-1",
        credentials: credentials
      });

      const command = new InvokeCommand({
        FunctionName: "IST2SQL",
        Payload: JSON.stringify({ question: input }),
      });

      const response = await lambdaClient.send(command);
      const decodedPayload = new TextDecoder().decode(response.Payload);
      const parsedResponse = JSON.parse(decodedPayload);
      const data = JSON.parse(parsedResponse.body);

      const sqlMessage: Message = { 
        text: data.sql_query, 
        sender: 'bot',
        type: 'sql'
      };
      setMessages(prev => [...prev, sqlMessage]);

      const summaryMessage: Message = {
        text: data.summary,
        sender: 'bot',
        type: 'summary'
      };
      setMessages(prev => [...prev, summaryMessage]);

    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = { 
        text: 'Sorry, I encountered an error processing your request.', 
        sender: 'bot' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                OMOP Healthcare Assistant
              </h1>
              <p className="text-gray-600">
                Welcome, {user.username} | Intelligent SQL queries for healthcare data
              </p>
            </div>
            <button
              onClick={signOut}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Sign Out
            </button>
          </div>

          {/* Chat Container */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Messages */}
            <div className="h-96 overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.type === 'sql'
                      ? 'bg-gray-100 text-gray-800 font-mono text-sm'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {message.type === 'sql' && (
                      <div className="text-xs text-blue-600 font-semibold mb-1">SQL Query:</div>
                    )}
                    {message.type === 'summary' && (
                      <div className="text-xs text-green-600 font-semibold mb-1">Summary:</div>
                    )}
                    <div className="whitespace-pre-wrap">{message.text}</div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span>Analyzing your query...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="border-t p-4">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about patients, procedures, medications..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Authenticator>
      {({ signOut, user }) => <ChatInterface user={user} signOut={signOut} />}
    </Authenticator>
  );
}
