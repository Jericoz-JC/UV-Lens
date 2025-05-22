import { env } from "~/env";

interface WeatherApiResponse {
  name: string;
  main: {
    temp: number;
  };
  weather: Array<{
    description: string;
  }>;
  coord?: {
    lat: number;
    lon: number;
  };
  country?: string;
  sys?: {
    country: string;
  };
}

interface UVApiResponse {
  value: number;
  date?: string;
  date_iso?: string;
}

// Current weather with UV index from OpenWeather
export const getCurrentWeatherAndUV = async (lat: number, lon: number): Promise<{
  weather: WeatherApiResponse;
  uv: UVApiResponse;
}> => {
  const apiKey = env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  
  console.log('🌍 Fetching weather data for coordinates:', { lat, lon });
  
  try {
    // Get current weather
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    );
    
    // Get UV index
    const uvResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${apiKey}`
    );
    
    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text();
      console.error('❌ Weather API error:', weatherResponse.status, errorText);
      throw new Error(`Weather API request failed: ${weatherResponse.status}`);
    }
    
    if (!uvResponse.ok) {
      const errorText = await uvResponse.text();
      console.error('❌ UV API error:', uvResponse.status, errorText);
      throw new Error(`UV API request failed: ${uvResponse.status}`);
    }
    
    const weather = await weatherResponse.json() as WeatherApiResponse;
    const uv = await uvResponse.json() as UVApiResponse;
    
    // Log the city and location data for verification
    console.log('🏙️ Weather data received:', {
      cityName: weather.name,
      country: weather.sys?.country,
      coordinates: weather.coord,
      temperature: weather.main.temp,
      requestedCoords: { lat, lon }
    });
    
    console.log('☀️ UV data received:', {
      uvIndex: uv.value,
      date: uv.date_iso ?? uv.date
    });
    
    return { weather, uv };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
};

// OpenUV API call (requires separate API key)
export const getDetailedUV = async (lat: number, lon: number) => {
  // Note: You'll need to get an API key from https://www.openuv.io/
  const openUVApiKey = process.env.NEXT_PUBLIC_OPENUV_API_KEY;
  
  if (!openUVApiKey) {
    console.warn('OpenUV API key not provided');
    return null;
  }
  
  try {
    const response = await fetch(
      `https://api.openuv.io/api/v1/uv?lat=${lat}&lng=${lon}`,
      {
        headers: {
          'x-access-token': openUVApiKey
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('OpenUV API request failed');
    }
    
    return await response.json() as unknown;
  } catch (error) {
    console.error('Error fetching detailed UV data:', error);
    throw error;
  }
};

// Get user's current location
export const getCurrentLocation = (): Promise<{ lat: number; lon: number; accuracy?: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    
    console.log('📍 Requesting user location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        console.log('✅ Location obtained:', {
          ...location,
          accuracyMeters: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString()
        });
        
        resolve(location);
      },
      (error: GeolocationPositionError) => {
        console.error('❌ Geolocation error:', {
          code: error.code,
          message: error.message,
          errorType: getGeolocationErrorType(error.code)
        });
        reject(new Error(`Location error: ${getGeolocationErrorType(error.code)} - ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout to 15 seconds
        maximumAge: 60000 // Reduced cache age to 1 minute for more accurate location
      }
    );
  });
};

// Helper function to decode geolocation error codes
const getGeolocationErrorType = (code: number): string => {
  switch (code) {
    case 1:
      return 'Permission denied';
    case 2:
      return 'Position unavailable';
    case 3:
      return 'Timeout';
    default:
      return 'Unknown error';
  }
}; 