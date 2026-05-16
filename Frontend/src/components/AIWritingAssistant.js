import React, { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  SparklesIcon,
  XMarkIcon,
  ArrowPathIcon,
  CheckIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

const AIWritingAssistant = ({ 
  onInsert, 
  eventContext = {}, 
  reportType = 'event',
  currentText = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [improvementType, setImprovementType] = useState('grammar');
  const [mode, setMode] = useState('generate'); // 'generate', 'improve', 'suggestions'
  const [suggestions, setSuggestions] = useState([]);

  const handleGenerate = async () => {
    if (!userInput.trim()) {
      toast.error('Please provide some input');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/ai-assistant/generate', {
        prompt: userInput,
        context: {
          ...eventContext,
          userInput,
          reportType
        }
      });

      setGeneratedContent(response.data.content);
      toast.success(`Generated ${response.data.wordCount} words!`);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to generate content';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async () => {
    const textToImprove = currentText || userInput;
    if (!textToImprove.trim()) {
      toast.error('No text to improve');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/ai-assistant/improve', {
        text: textToImprove,
        improvementType
      });

      setGeneratedContent(response.data.improvedText);
      toast.success('Text improved!');
    } catch (error) {
      toast.error('Failed to improve text');
    } finally {
      setLoading(false);
    }
  };

  const handleGetSuggestions = async () => {
    const text = currentText || userInput;
    if (!text.trim()) {
      toast.error('Please provide some text');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/ai-assistant/suggestions', {
        partialText: text,
        eventContext
      });

      setSuggestions(response.data.suggestions);
      toast.success('Got suggestions!');
    } catch (error) {
      toast.error('Failed to get suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (generatedContent) {
      onInsert(generatedContent);
      toast.success('Content inserted!');
      setIsOpen(false);
      setGeneratedContent('');
      setUserInput('');
    }
  };

  const handleInsertSuggestion = (suggestion) => {
    onInsert(currentText + '\n\n' + suggestion);
    toast.success('Suggestion added!');
    setIsOpen(false);
    setSuggestions([]);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 shadow-md"
      >
        <SparklesIcon className="h-5 w-5" />
        Write with AI
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <SparklesIcon className="h-6 w-6" />
            <h2 className="text-xl font-bold">AI Writing Assistant</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:text-gray-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Mode Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('generate')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                mode === 'generate'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✨ Generate
            </button>
            <button
              onClick={() => setMode('improve')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                mode === 'improve'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🔧 Improve
            </button>
            <button
              onClick={() => setMode('suggestions')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                mode === 'suggestions'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              💡 Suggestions
            </button>
          </div>

          {/* Generate Mode */}
          {mode === 'generate' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What do you want to write about?
                </label>
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="E.g., We conducted a blood donation camp where 50 students donated blood. I helped with registration and awareness..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Provide a brief description, and AI will expand it into a complete report
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || !userInput.trim()}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          )}

          {/* Improve Mode */}
          {mode === 'improve' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select improvement type
                </label>
                <select
                  value={improvementType}
                  onChange={(e) => setImprovementType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="grammar">Fix Grammar & Spelling</option>
                  <option value="professional">Make More Professional</option>
                  <option value="detailed">Add More Details</option>
                  <option value="concise">Make More Concise</option>
                </select>
              </div>

              {!currentText && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste your text here
                  </label>
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    rows="6"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Paste the text you want to improve..."
                  />
                </div>
              )}

              <button
                onClick={handleImprove}
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Improving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-5 w-5" />
                    Improve Text
                  </>
                )}
              </button>
            </div>
          )}

          {/* Suggestions Mode */}
          {mode === 'suggestions' && (
            <div className="space-y-4">
              {!currentText && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your partial text
                  </label>
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Start writing your report, and AI will suggest how to continue..."
                  />
                </div>
              )}

              <button
                onClick={handleGetSuggestions}
                disabled={loading}
                className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Getting Suggestions...
                  </>
                ) : (
                  <>
                    <LightBulbIcon className="h-5 w-5" />
                    Get Suggestions
                  </>
                )}
              </button>

              {suggestions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Suggestions:</h3>
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                    >
                      <p className="text-sm text-gray-700 mb-2">{suggestion}</p>
                      <button
                        onClick={() => handleInsertSuggestion(suggestion)}
                        className="text-xs text-yellow-700 hover:text-yellow-900 font-medium"
                      >
                        Add this →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Generated Content Display */}
          {generatedContent && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Generated Content:</h3>
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-gray-800 whitespace-pre-wrap">{generatedContent}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleInsert}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <CheckIcon className="h-5 w-5" />
                  Insert Content
                </button>
                <button
                  onClick={() => setGeneratedContent('')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>💡 Tip:</strong> The AI assistant uses your input to generate professional NSS reports. 
              You can edit the generated content before inserting it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIWritingAssistant;
