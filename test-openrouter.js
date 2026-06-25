const axios = require('axios');
require('dotenv').config();

const openrouterKey = process.env.OPENROUTER_API_KEY;

async function test() {
  try {
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'meta-llama/llama-3.1-70b-instruct',
      messages: [
        { role: 'user', content: 'Say hello in one word' }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Result:', res.data.choices[0].message.content);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
