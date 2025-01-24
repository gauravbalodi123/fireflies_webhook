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
const url = "https://api.fireflies.ai/graphql";
const FIRELIES_API_KEY = process.env.FIRELIES_API_KEY;
console.log(FIRELIES_API_KEY);
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${FIRELIES_API_KEY}`,
};

// Endpoint to receive webhook
app.post("/fireflies-webhook", async (req, res) => {
  const signature = req.headers["x-hub-signature"];
  if (!signature) {
    console.error("Missing signature header");
    return res.status(400).send("Missing signature header");
  }
  const payload = JSON.stringify(req.body);

  const hash =
    "sha256=" +
    crypto.createHmac("sha256", FIRELIES_WEBHOOK_SECRET).update(payload).digest("hex");

  if (signature !== hash) {
    console.error("Signature mismatch");
    return res.status(401).send("Invalid signature");
  }

  // Extracting meetingId and eventType
  const event = req.body;
  console.log(event);
  const { meetingId, eventType } = req.body;
  console.log(`Received event: Meeting ID: ${meetingId}, Event Type: ${eventType}`);

  // Check if the event type is "Transcription completed"
  if (eventType === "Transcription completed") {
    console.log(`Fetching data for Meeting ID: ${meetingId}`);
    try {
      // Use the meetingId in place of transcriptId
      await fetchTranscriptData(meetingId);
    } catch (error) {
      console.error("Error fetching transcript data:", error);
    }
  }

  res.status(200).send("Webhook received");
});

// Function to fetch transcription data using GraphQL
async function fetchTranscriptData(transcriptId) {
  const data = {
    query: `query Transcript($transcriptId: String!) {
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
    }`,
    variables: { transcriptId },
  };

  axios
    .post(url, data, { headers: headers })
    .then((response) => {
      console.log(JSON.stringify(response.data, null, 2));
    })
    .catch((error) => {
      if (error.response) {
        console.error("Axios Error Response:", error.response.data);
      } else {
        console.error("Error:", error.message);
      }
    });
}

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
