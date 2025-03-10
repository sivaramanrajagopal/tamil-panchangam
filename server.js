const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get panchang data
app.post('/api/panchang', async function(req, res) {
  try {
    // Get credentials from environment variables
    const clientId = process.env.PROKERALA_CLIENT_ID;
    const clientSecret = process.env.PROKERALA_CLIENT_SECRET;
    const scopeOption = process.env.PROKERALA_SCOPE || '';
    
    // Get request parameters
    const date = req.body.date;
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const ayanamsa = req.body.ayanamsa || 1; // Default to Lahiri if not specified
    
    console.log('Request params:', { 
      date: date, 
      latitude: latitude, 
      longitude: longitude, 
      ayanamsa: ayanamsa 
    });
    console.log('Using client ID:', clientId);
    
    // Get OAuth token with scope
    var tokenResponse;
    try {
      console.log('Attempting to get access token...');
      
      // Create the params object
      var params = new URLSearchParams({
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
      
      // Log detailed error information
      if (tokenError.response) {
        console.error('Response status:', tokenError.response.status);
        console.error('Response data:', JSON.stringify(tokenError.response.data));
        console.error('Response headers:', tokenError.response.headers);
        
        return res.status(tokenError.response.status).json({
          error: 'Authentication failed',
          details: tokenError.response.data,
          message: 'Authentication error: ' + (tokenError.response.data.errors && tokenError.response.data.errors[0] ? tokenError.response.data.errors[0].detail : 'Unknown error')
        });
      } else {
        return res.status(500).json({
          error: 'Authentication request failed',
          message: tokenError.message
        });
      }
    }
    
    var accessToken = tokenResponse.data.access_token;
    console.log('Access token obtained successfully');
    
    // Get panchang data
    // Use v2 or v3 based on what's available
    var apiVersion = req.body.apiVersion || 'v2';
    
    // Construct the API URL with Tamil language parameter
    var apiUrl = 'https://api.prokerala.com/' + apiVersion + 
                 '/astrology/panchang?ayanamsa=' + ayanamsa + 
                 '&coordinates=' + latitude + ',' + longitude + 
                 '&datetime=' + encodeURIComponent(date + 'T00:00:00+05:30') + 
                 '&la=ta';  // Explicitly set language to Tamil
    
    console.log('Requesting panchang data from:', apiUrl);
    
    var panchangResponse;
    try {
      panchangResponse = await axios.get(apiUrl, {
        headers: {
          'Authorization': 'Bearer ' + accessToken
        }
      });
      console.log('Panchang response status:', panchangResponse.status);
    } catch (apiError) {
      console.error('API request failed:', apiError.message);
      
      if (apiError.response) {
        console.error('Response status:', apiError.response.status);
        console.error('Response data:', JSON.stringify(apiError.response.data));
        
        return res.status(apiError.response.status).json({
          error: 'API request failed',
          details: apiError.response.data
        });
      } else {
        return res.status(500).json({
          error: 'API request failed',
          message: apiError.message
        });
      }
    }
    
    console.log('Successfully retrieved panchang data');
    
    // Send the response directly without any translation
    res.json(panchangResponse.data);
  } catch (error) {
    console.error('General error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message
    });
  }
});

// Alternative endpoint using direct API key
app.post('/api/panchang-direct', async function(req, res) {
  try {
    // Get API key from environment variable
    const apiKey = process.env.PROKERALA_API_KEY || process.env.PROKERALA_CLIENT_ID;
    
    // Get request parameters
    const date = req.body.date;
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const ayanamsa = req.body.ayanamsa || 1; // Default to Lahiri if not specified
    
    // Try direct API key approach instead of OAuth
    var apiVersion = req.body.apiVersion || 'v2';
    var apiUrl = 'https://api.prokerala.com/' + apiVersion + 
                 '/astrology/panchang?ayanamsa=' + ayanamsa + 
                 '&coordinates=' + latitude + ',' + longitude + 
                 '&datetime=' + encodeURIComponent(date + 'T00:00:00+05:30') + 
                 '&client_id=' + apiKey + 
                 '&la=ta';  // Explicitly set language to Tamil
    
    console.log('Requesting data using direct API key approach from:', apiUrl);
    
    var response = await axios.get(apiUrl);
    console.log('Response status:', response.status);
    
    res.json(response.data);
  } catch (error) {
    console.error('Error with direct API approach:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        error: 'API request failed',
        details: error.response.data
      });
    } else {
      res.status(500).json({
        error: 'Server error',
        message: error.message
      });
    }
  }
});

// Serve the index.html for all routes
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, function() {
  console.log('Server running at http://localhost:' + PORT);
  console.log('Open this URL in your browser to use the application');
});