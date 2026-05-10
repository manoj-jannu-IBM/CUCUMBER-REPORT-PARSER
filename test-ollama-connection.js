const axios = require('axios');

async function testOllama() {
  console.log('Testing Ollama connection...\n');
  
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  
  try {
    // Test 1: Check if Ollama is running
    console.log('1. Testing base URL:', baseUrl);
    const healthCheck = await axios.get(baseUrl);
    console.log('✓ Ollama is running!');
    console.log('Response:', healthCheck.data);
    
    // Test 2: List models
    console.log('\n2. Listing available models...');
    const modelsResponse = await axios.get(`${baseUrl}/api/tags`);
    console.log('✓ Models found:', JSON.stringify(modelsResponse.data, null, 2));
    
    // Test 3: Try generate API
    console.log('\n3. Testing generate API...');
    const generateResponse = await axios.post(`${baseUrl}/api/generate`, {
      model: process.env.OLLAMA_MODEL || 'llama3.2',
      prompt: 'Say hello in one word',
      stream: false
    });
    console.log('✓ Generate API works!');
    console.log('Response:', generateResponse.data.response);
    
    // Test 4: Try chat API (what the code uses)
    console.log('\n4. Testing chat API...');
    const chatResponse = await axios.post(`${baseUrl}/api/chat`, {
      model: process.env.OLLAMA_MODEL || 'llama3.2',
      messages: [
        { role: 'user', content: 'Say hello in one word' }
      ],
      stream: false
    });
    console.log('✓ Chat API works!');
    console.log('Response:', chatResponse.data.message.content);
    
    console.log('\n✓✓✓ All tests passed! Ollama is working correctly.');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    console.error('\nTroubleshooting:');
    console.error('1. Check OLLAMA_BASE_URL in .env:', baseUrl);
    console.error('2. Verify Ollama is running: curl', baseUrl);
    console.error('3. Check if model is downloaded: ollama list');
    console.error('4. Try: ollama run', process.env.OLLAMA_MODEL || 'llama3.2');
  }
}

// Load .env
require('dotenv').config();

testOllama();

// Made with Bob
