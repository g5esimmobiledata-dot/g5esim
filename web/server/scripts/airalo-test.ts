
import dotenv from "dotenv";
dotenv.config();
import axios from "axios";

const clientId = process.env.AIRALO_API_KEY;
const clientSecret = process.env.AIRALO_API_SECRET;

async function testAiralo() {
  console.log("Checking Airalo Credentials...");
  console.log("Client ID:", clientId ? "Present" : "MISSING");
  console.log("Client Secret:", clientSecret ? "Present" : "MISSING");

  if (!clientId || !clientSecret) {
    console.error("Error: Missing credentials in .env");
    return;
  }

  try {
    console.log("Attempting to get token from Production...");
    const response = await axios.post("https://partners-api.airalo.com/v2/token", {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    });
    console.log("Success! Status:", response.status);
    console.log("Token received:", response.data.data.access_token.substring(0, 10) + "...");
  } catch (error: any) {
    console.error("Production Token Request Failed:", error.response?.data || error.message);
    
    console.log("\nAttempting to get token from Sandbox...");
    try {
      const response = await axios.post("https://sandbox-partners-api.airalo.com/v2/token", {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      });
      console.log("Success (Sandbox)! Status:", response.status);
      console.log("Token received:", response.data.data.access_token.substring(0, 10) + "...");
    } catch (sbError: any) {
      console.error("Sandbox Token Request Failed:", sbError.response?.data || sbError.message);
    }
  }
}

testAiralo();
