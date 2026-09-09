# AI Form Trainer - Frontend

This is the frontend for the AI Form Trainer project. It uses React, Vite, and MediaPipe for in-browser pose detection.

## Portfolio / Mock Mode
For resumes or portfolios, you can deploy **only the frontend** to Vercel/Netlify without needing to host the heavy Python/FastAPI ML backend.

Set this environment variable in Vercel or your `.env` file:
`VITE_IS_MOCK=true`

The frontend will automatically:
1. Provide a "Portfolio Demo Login" button.
2. Intercept API calls to return realistic dummy data (History, Stats).
3. Intercept the WebSocket connection to simulate the AI Backend. The camera will still track your body using MediaPipe, and the mock WebSocket will return fake ML predictions (counting reps and simulating form corrections) so recruiters can experience the app fully in the browser!
