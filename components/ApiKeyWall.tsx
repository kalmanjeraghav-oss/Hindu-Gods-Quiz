import React, { useEffect, useState } from 'react';
import { checkApiKey, requestApiKey } from '../services/geminiService';
import Button from './Button';

interface ApiKeyWallProps {
  onKeySelected: () => void;
}

const ApiKeyWall: React.FC<ApiKeyWallProps> = ({ onKeySelected }) => {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verify = async () => {
      try {
        const hasKey = await checkApiKey();
        if (hasKey) {
          onKeySelected();
        }
      } catch (e) {
        console.error("Error checking key:", e);
      } finally {
        setChecking(false);
      }
    };
    verify();
  }, [onKeySelected]);

  const handleSelectKey = async () => {
    try {
      await requestApiKey();
      // Assume success as per prompt guidelines
      onKeySelected();
    } catch (error) {
      console.error("Key selection failed:", error);
    }
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-stone-100 text-stone-500">Initializing...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-100 p-4 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-orange-100">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
          🕉️
        </div>
        <h1 className="text-3xl font-bold mb-4 text-stone-800 serif">Divine Quiz</h1>
        <p className="text-stone-600 mb-8">
          To generate high-quality images of the Deities and chat with the AI Guru, please select your Google Cloud API Key.
        </p>
        <Button onClick={handleSelectKey} className="w-full justify-center">
          Select API Key
        </Button>
        <div className="mt-4 text-xs text-stone-400">
            Powered by Gemini 3 Pro. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-600">Billing Information</a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyWall;