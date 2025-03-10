const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Sample fallback data function
function getSamplePanchangamData(date, location) {
  return {
    datetime: date + "T00:00:00+05:30",
    coordinates: {
      latitude: location.latitude,
      longitude: location.longitude
    },
    vaara: "புதன்",
    sunrise: "06:15:00 +0530",
    sunset: "18:30:00 +0530",
    nakshatra: [
      {
        name: "அஸ்வினி",
        start: "00:00:00 +0530",
        end: "08:45:00 +0530"
      },
      {
        name: "பரணி",
        start: "08:45:00 +0530",
        end: "23:59:59 +0530"
      }
    ],
    tithi: [
      {
        name: "சஷ்டி",
        start: "00:00:00 +0530",
        end: "14:20:00 +0530"
      },
      {
        name: "சப்தமி",
        start: "14:20:00 +0530",
        end: "23:59:59 +0530"
      }
    ],
    karana: [
      {
        name: "பவ",
        start: "00:00:00 +0530",
        end: "13:45:00 +0530"
      },
      {
        name: "பாலவ",
        start: "13:45:00 +0530",
        end: "23:59:59 +0530"
      }
    ],
    yoga: [
      {
        name: "சித்த",
        start: "00:00:00 +0530",
        end: "16:30:00 +0530"
      },
      {
        name: "சாத்தியம்",
        start: "16:30:00 +0530",
        end: "23:59:59 +0530"
      }
    ],
    muhurta: {
      rahu: {
        start: "09:15:00 +0530",
        end: "10:45:00 +0530"
      },
      yama: {
        start: "13:30:00 +0530",
        end: "15:00:00 +0530"
      },
      gulika: {
        start: "06:15:00 +0530",
        end: "07:45:00 +0530"
      }
    }
  };
}

// API endpoint to get panchang data
app.post('/api/panchang', async function(req, res) {
  try {
    // Get credentials from environment variables
    const clientId = process.env.PROKERALA_CLIENT_ID;
    const clientSecret = process.env.PROKERALA_CLIENT_SECRET;
    const scopeOption = process.env.PROKERALA_SCOPE || '';
    
    // Get request parameters
    const { date, latitude, longitude, ayanamsa = 1 } = req.body;
    
    // Validate input
    if (!date || !latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'Date, latitude, and longitude are required'
      });
    }
    
    console.log('Request params:', { 
      date, 
      latitude, 
      longitude, 
      ayanamsa 
    });

    // If no credentials, return sample data
    if (!clientId || !clientSecret) {
      console.warn('No API credentials provided. Returning sample data.');
      return res.json(getSamplePanchangamData(date, { latitude, longitude }));
    }
    
    // Get OAuth token with scope
    let tokenResponse;
    try {
      console.log('Attempting to get access token...');
      
      // Create the params object
      const params = new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': clientId,
        'client_secret': clientSecret,
      });
      
      // Only add the scope if one was provided
      if (scopeOption) {
        params.append('scope', scopeOption);
        console.log('Using scope: ' + scopeOption);
      } else {
        console.log('Attempting authentication without a scope');
      }
      
      tokenResponse = await axios.post('https://api.prokerala.com/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      console.log('Token response status:', tokenResponse.status);
    } catch (tokenError) {
      console.error('Token request failed:', tokenError.message);
      
      // Return sample data if token request fails
      return res.json(getSamplePanchangamData(date, { latitude, longitude }));
    }
    
    const accessToken = tokenResponse.data.access_token;
    console.log('Access token obtained successfully');
    
    // Construct the API URL with Tamil language parameter
    const apiVersion = req.body.apiVersion || 'v2';
    const apiUrl = `https://api.prokerala.com/${apiVersion}/astrology/panchang?` +
                   `ayanamsa=${ayanamsa}` +
                   `&coordinates=${latitude},${longitude}` +
                   `&datetime=${encodeURIComponent(date + 'T00:00:00+05:30')}` +
                   '&la=ta';  // Explicitly set language to Tamil
    
    console.log('Requesting panchang data from:', apiUrl);
    
    try {
      const panchangResponse = await axios.get(apiUrl, {
        headers: {
          'Authorization': 'Bearer ' + accessToken
        }
      });
      console.log('Panchang response status:', panchangResponse.status);
      
      // Send the response directly
      res.json(panchangResponse.data);
    } catch (apiError) {
      console.error('API request failed:', apiError.message);
      
      // Return sample data if API request fails
      return res.json(getSamplePanchangamData(date, { latitude, longitude }));
    }
  } catch (error) {
    console.error('General error:', error);
    
    // Return sample data for any unexpected errors
    res.json(getSamplePanchangamData(req.body.date, { 
      latitude: req.body.latitude, 
      longitude: req.body.longitude 
    }));
  }
});

// Serve the index.html for all routes
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, function() {
  console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = app;