const express = require('express');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const appsData = JSON.parse(fs.readFileSync('apps.json', 'utf-8')).apps;

function findAppInfo(appName) {
  return appsData.find(app => app.name.toLowerCase() === appName.toLowerCase());
}

app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;
  // Try to match an app name in the user's message
  const app = appsData.find(app =>
    userMessage.toLowerCase().includes(app.name.toLowerCase())
  );

  if (app) {
    // Short summary for user-friendliness
    const summary = 
      `**${app.name}** collects personal data such as: ${app.data_collected.slice(0, 3).join('; ')}... ` +
      `Risk Level: **${app.risk_score}**. ` +
      `For a full breakdown and privacy tips, [search for "${app.name}" on TrackFree.me](#features) or visit: ${app.sources[0]}`;
    return res.json({ reply: summary });
  }

  // Fallback: send to Mistral if not found
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "mistral-tiny",
        messages: [{ role: "user", content: userMessage }]
      })
    });
    const data = await response.json();
    if (
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      res.json({ reply: data.choices[0].message.content });
    } else {
      res.json({ reply: "Sorry, I couldn't get a response from the AI." });
    }
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ reply: "Sorry, there was an error contacting the AI." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));