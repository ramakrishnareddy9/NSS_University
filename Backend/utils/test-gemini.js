const dotenv = require('dotenv');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testGeminiAPI() {
  console.log('\n🧪 Testing Gemini API Configuration...\n');
  
  // Check if API key exists
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    return;
  }
  
  console.log('✅ GEMINI_API_KEY found:', process.env.GEMINI_API_KEY.substring(0, 20) + '...');
  
  try {
    // Initialize Gemini AI
    console.log('\n📡 Initializing Gemini AI...');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try to get the model
    console.log('📦 Getting gemini-flash-latest model (fallback for rate limits)...');
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    console.log('✅ Model initialized successfully');
    
    // Try a simple test prompt
    console.log('\n💬 Sending test prompt...');
    const result = await model.generateContent('Say hello in one sentence');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ API Response received:');
    console.log('   Response:', text);
    console.log('\n🎉 Gemini API is working correctly!\n');
    
  } catch (error) {
    console.error('\n❌ Error testing Gemini API:');
    console.error('   Name:', error.name);
    console.error('   Message:', error.message);
    
    if (error.response) {
      console.error('   Response:', error.response);
    }
    
    if (error.stack) {
      console.error('\n   Stack trace:');
      console.error(error.stack);
    }
    
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Verify your API key at: https://makersuite.google.com/app/apikey');
    console.log('   2. Ensure API key has not expired or been revoked');
    console.log('   3. Check if you have billing enabled (if required)');
    console.log('   4. Try generating a new API key');
    console.log('   5. Check your internet connection');
  }
}

// Run the test
testGeminiAPI();
