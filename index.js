const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

// Your Fireflies webhook secret
const FIRELIES_WEBHOOK_SECRET = process.env.FIRELIES_WEBHOOK_SECRET;
console.log(FIRELIES_WEBHOOK_SECRET);

// Fireflies GraphQL API endpoint and headers
const FIRELIES_GRAPHQL_URL = "https://api.fireflies.ai/graphql";
const FIRELIES_API_KEY = process.env.FIRELIES_API_KEY; // Replace with your actual API key
console.log(FIRELIES_API_KEY);
const HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${FIRELIES_API_KEY}`,
};

// Endpoint to receive webhook
app.post("/fireflies-webhook", async (req, res) => {
  const signature = req.headers["x-hub-signature"];
  const payload = JSON.stringify(req.body);

  // Verify the signature
  const hash = crypto
    .createHmac("sha256", FIRELIES_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  if (signature !== hash) {
    return res.status(401).send("Invalid signature");
  }

  // Process the webhook data
  const event = req.body;
  console.log(event);
  const { transcriptionId, status } = req.body;
  console.log(`Transcription ID: ${transcriptionId}, Status: ${status}`);

  // Check if transcription is complete
  if (status === "completed") {
    console.log(`Fetching data for Transcription ID: ${transcriptionId}`);
    try {
      // Fetch data using Fireflies GraphQL API
      const data = await fetchTranscriptData(transcriptionId);
      console.log("Transcription Data:", JSON.stringify(data, null, 2)); // Log the fetched data
    } catch (error) {
      console.error("Error fetching transcript data:", error);
    }
  }

  res.status(200).send("Webhook received");
});

// Function to fetch transcription data using GraphQL
async function fetchTranscriptData(transcriptionId) {
  const query = `
    query Transcript($transcriptId: String!) {
      transcript(id: $transcriptId) {
        id
        title
        organizer_email
        participants
        date
        transcript_url
        speakers {
          id
          name
        }
        user {
          user_id
          email
          name
          num_transcripts
          recent_meeting
          minutes_consumed
          is_admin
        }
        meeting_attendees {
          displayName
          email
          phoneNumber
          name
        }
        summary {
          keywords
          overview
          bullet_gist
          short_summary
          topics_discussed
        }
      }
    }
  `;

  const variables = { transcriptId };

  const response = await axios.post(
    FIRELIES_GRAPHQL_URL,
    { query, variables },
    { headers: HEADERS }
  );

  if (response.data.errors) {
    throw new Error(`GraphQL Errors: ${JSON.stringify(response.data.errors)}`);
  }

  return response.data.data.transcript;
}

// Start the server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
