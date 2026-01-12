import axios from 'axios';

// ✅ FIXED: Using the full Render URL. 
// Note: I renamed API_IP to API_URL because it's a domain, not an IP.
const API_URL = "https://tripura-library-backend.onrender.com"; 

const api = axios.create({
    // ✅ FIXED: Removed "https://" (because API_URL has it)
    // ✅ FIXED: Removed ":8000" (Render uses standard HTTPS port automatically)
    baseURL: API_URL, 
    headers: { 'Content-Type': 'application/json' },
});

export async function askTripuraAI(query) {
  try {
    const response = await api.post('/ask_ai', { query: query });
    return response.data.answer;
  } catch (error) {
    console.error("App Error:", error);
    // Updated error message to match the actual situation
    return "Connection failed. Please check the backend deployment.";
  }
}

export default api;