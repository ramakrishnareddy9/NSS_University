const dotenv = require('dotenv');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function listAvailableModels() {
  console.log('\n🔍 Listing Available Gemini Models...\n');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    return;
  }
  
  console.log('✅ GEMINI_API_KEY found\n');
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    console.log('📡 Fetching available models...\n');
    
    // Try to list models using the API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
    }
    
    const data = await response.json();
    
    if (data.models && data.models.length > 0) {
      console.log('✅ Available Models:\n');
      data.models.forEach((model, index) => {
        console.log(`${index + 1}. ${model.name}`);
        console.log(`   Display Name: ${model.displayName}`);
        console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
        console.log('');
      });
      
      console.log('\n💡 Recommended models for your application:');
      const textModels = data.models.filter(m => 
        m.supportedGenerationMethods?.includes('generateContent') &&
        (m.name.includes('gemini') || m.name.includes('pro'))
      );
      
      if (textModels.length > 0) {
        console.log('\n📝 Text Generation Models:');
        textModels.forEach(m => {
          const modelId = m.name.replace('models/', '');
          console.log(`   - ${modelId}`);
        });
      }
    } else {
      console.log('⚠️  No models found or API key has no access to models');
    }
    
  } catch (error) {
    console.error('\n❌ Error listing models:');
    console.error('   Message:', error.message);
    
    if (error.message.includes('401')) {
      console.log('\n🔑 Your API key appears to be invalid or expired.');
      console.log('   Please generate a new API key at: https://aistudio.google.com/apikey');
    } else if (error.message.includes('403')) {
      console.log('\n🔒 Access denied. Your API key may not have permissions.');
      console.log('   1. Verify the API key at: https://aistudio.google.com/apikey');
      console.log('   2. Check if billing is enabled (if required)');
    } else if (error.message.includes('404')) {
      console.log('\n⚠️  API endpoint not found. This usually means:');
      console.log('   1. The API key is from an old system');
      console.log('   2. You need to generate a NEW key from: https://aistudio.google.com/apikey');
    }
  }
}

// Run the script
listAvailableModels();
