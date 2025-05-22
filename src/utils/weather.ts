import { env } from "~/env";

// Current weather with UV index from OpenWeather
export const getCurrentWeatherAndUV = async (lat: number, lon: number) => {
  const apiKey = env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  
  try {
    // Get current weather
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    );
    
    // Get UV index
    const uvResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${apiKey}`
    );
    
    if (!weatherResponse.ok || !uvResponse.ok) {
      throw new Error('Weather API request failed');
    }
    
    return {
      weather: await weatherResponse.json(),
      uv: await uvResponse.json()
    };
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
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching detailed UV data:', error);
    throw error;
  }
};

// Get user's current location
export const getCurrentLocation = (): Promise<{ lat: number; lon: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
}; 