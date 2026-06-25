const axios = require('axios');
require('dotenv').config();

const nvidiaKey = process.env.NVIDIA_API_KEY;

async function testNvidia() {
  console.log('Sending request to Nvidia Integration API...');
  const start = Date.now();
  try {
    const response = await axios.post(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        model: 'meta/llama-3.1-70b-instruct',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Identify the capital of France in JSON: {"capital": "..."}' }
        ],
        temperature: 0.1,
        top_p: 0.95
      },
      {
        headers: {
          'Authorization': `Bearer ${nvidiaKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 seconds timeout
      }
    );
    console.log(`Success! Response received in ${Date.now() - start}ms:`);
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('Error occurred:');
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }
}

testNvidia();
