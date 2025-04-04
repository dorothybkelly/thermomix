// api/convert.js (or api/index.js depending on platform)

// Import the Google Generative AI SDK
const { GoogleGenerativeAI } = require("@google/generative-ai");

// IMPORTANT: Load the API Key from environment variables for security
// Ensure GEMINI_API_KEY is set in your serverless function's environment
const apiKey = process.env.GEMINI_API_KEY;

// Check if the API key is available
if (!apiKey) {
  // Log an error on the server side (won't be sent to client)
  console.error("FATAL ERROR: GEMINI_API_KEY environment variable not set.");
  // Optionally throw an error to prevent the function from running further
  // throw new Error("API Key not configured.");
}

// Initialize the Google AI client with the API key
// Note: It's okay to initialize even if the key is missing here,
// but the API call will fail later if the key is truly absent.
const genAI = new GoogleGenerativeAI(apiKey || "MISSING_API_KEY"); // Use placeholder if missing to avoid crash

// Define the AI model to use (e.g., Gemini Pro)
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Define the core instructions (system prompt) for the AI model
const systemPrompt = `You are an expert culinary assistant specializing in converting standard recipes into instructions for a Thermomix TM6.
Your task is to take the user-provided recipe text and output a list of numbered steps specifically formatted for the Thermomix TM6.
Adhere strictly to the following guidelines:
1.  Analyze the ingredients and instructions in the provided text.
2.  Translate the cooking steps into concise Thermomix actions.
3.  Use standard Thermomix settings format: "[Action] [Duration] / [Temperature or Varoma] / [Speed Setting]". Examples: "Sauté 3 min / 120°C / speed 1", "Chop 3 sec / speed 7", "Mix 20 sec / speed 4". Omit non-applicable parts (like temp/speed for chopping or mixing time).
4.  Temperature guidance: Use specific temperatures if given. If described (low/medium/high heat), use approximate Celsius: Low=50-70°C, Medium=80-95°C, High=100-120°C. Use 120°C or Varoma setting for sautéing or steaming. Use 37°C for melting or gentle warming. If no temperature is implied or given for a step, omit it.
5.  Speed guidance: Use common speeds for actions: Chopping speed 5-7, Mixing speed 3-5, Blending speed 8-10, Kneading use Dough/Knead function, Sautéing/Simmering speed 1-2 or Reverse speed soft/1. Prioritize speeds mentioned in the recipe.
6.  Time guidance: Use timings mentioned in the recipe. If not mentioned, you may suggest a typical time based on the action (e.g., chop 3-5 sec, sauté 3-5 min), but try to be conservative.
7.  Output *only* the numbered list of Thermomix steps, starting from step 1. Do not include the ingredients list, introductory sentences, concluding remarks, or any commentary unless it's essential within a step's instruction.
8.  If the input text is not a recipe or is too ambiguous to convert, respond with a single line: "Error: Could not convert the provided text into a Thermomix recipe."`;

// Define the main handler function for the serverless environment
// (Syntax might vary slightly based on platform: Vercel/Netlify often use default export)
export default async function handler(req, res) {
  // --- Basic Request Validation ---

  // Check if the API key is configured (important runtime check)
  if (!apiKey) {
    // Send an error response to the client
    return res.status(500).json({ error: "Server configuration error: API Key not set." });
  }

  // Allow requests only from specific origins in production for security (CORS)
  // Note: Platforms like Vercel/Netlify often handle this automatically for same-project deployments.
  // If running frontend/backend on different ports locally, you might need CORS headers.
  // Example (adjust origin as needed):
  // res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000'); // Or your frontend URL
  // res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  // res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight requests (OPTIONS method)
  if (req.method === 'OPTIONS') {
    // Set CORS headers for preflight
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust origin in production
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Check for Content-Type header
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('application/json')) {
      return res.status(415).json({ error: 'Unsupported Media Type: Content-Type must be application/json' });
  }

  // --- Process Request ---

  try {
    // Extract recipe text from the request body
    // Note: Body parsing is often handled automatically by Vercel/Netlify.
    // If not, you might need `const body = await req.json();` or use `body-parser` middleware.
    const { recipeText } = req.body;

    // Basic validation of input
    if (!recipeText || typeof recipeText !== 'string' || recipeText.trim().length === 0) {
      return res.status(400).json({ error: 'Recipe text is required in the request body.' });
    }

    // --- AI Interaction ---

    // Construct the full prompt for the AI
    const fullPrompt = `${systemPrompt}\n\nConvert the following recipe:\n\n${recipeText}`;

    // Send the prompt to the Gemini model
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const aiResponseText = await response.text();

    // Basic check if AI refused or couldn't generate
     if (!aiResponseText || aiResponseText.includes("Could not convert")) {
         console.warn("AI could not convert recipe:", recipeText.substring(0, 100)); // Log snippet server-side
         return res.status(400).json({ error: "AI failed to convert the recipe. It might not be a valid recipe format or is too ambiguous." });
     }


    // --- Send Response ---

    // Send the successful response back to the frontend
    res.status(200).json({ thermomixSteps: aiResponseText.trim() });

  } catch (error) {
    // --- Error Handling ---
    console.error("Error during recipe conversion:", error); // Log the detailed error on the server

    // Check for specific AI-related errors if possible (SDK might provide codes)
    // Example: if (error.code === 'RATE_LIMIT_EXCEEDED') ...

    // Send a generic server error response to the client
    res.status(500).json({ error: 'An unexpected error occurred on the server while converting the recipe.' });
  }
}
