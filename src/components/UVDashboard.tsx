import React, { useState, useEffect } from 'react';
import { getCurrentWeatherAndUV, getCurrentLocation } from '~/utils/weather';
import {   
  useUVProtection,  
  UVNotificationScheduler,  
  SKIN_TYPES,   
  type ProfileData
} from '~/utils/uvProtection';

interface WeatherData {  weather: {    name: string;    main: {      temp: number;    };    weather: Array<{      description: string;    }>;    sys?: {      country: string;    };  };  uv: { value: number };}

export default function UVDashboard() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock hourly forecast for demo - in real app this would come from weather API
  const mockHourlyForecast = weatherData ? 
    Array.from({ length: 24 }, (_, i) => weatherData.uv.value + Math.sin(i * 0.3) * 2) : [];

  const { protection, vitaminDTime } = useUVProtection(
    profile, 
    weatherData?.uv.value ?? 0, 
    mockHourlyForecast
  );

  // Load user location and weather data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Request notification permission
        await UVNotificationScheduler.requestNotificationPermission();
        
        // Get user location
        const userLocation = await getCurrentLocation();
        
        // Get weather and UV data
        const data = await getCurrentWeatherAndUV(userLocation.lat, userLocation.lon);
        setWeatherData(data);
        
        // Check for saved profile
        const savedProfile = localStorage.getItem('uvProfile');
        if (savedProfile) {
          setProfile(JSON.parse(savedProfile) as ProfileData);
        } else {
          setShowProfileSetup(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  // Schedule sunscreen reapplication reminders
  useEffect(() => {
    if (protection?.reapplyTime) {
      void UVNotificationScheduler.scheduleReapplicationReminder(protection.reapplyTime);
    }
  }, [protection]);

  const saveProfile = (newProfile: ProfileData) => {
    setProfile(newProfile);
    localStorage.setItem('uvProfile', JSON.stringify(newProfile));
    setShowProfileSetup(false);
  };

  const getUVLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'moderate': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'extreme': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getUVIndexColor = (uvIndex: number) => {
    if (uvIndex <= 2) return 'text-green-600';
    if (uvIndex <= 5) return 'text-yellow-600';
    if (uvIndex <= 7) return 'text-orange-600';
    if (uvIndex <= 10) return 'text-red-600';
    return 'text-purple-600';
  };

  const formatTime = (minutes: number) => {
    if (minutes === Infinity) return 'N/A';
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading UV data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-500 text-white px-6 py-2 rounded-full hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (showProfileSetup || !profile) {
    return <ProfileSetup onSave={saveProfile} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 mb-6 text-white">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">UV Lens</h1>
            <button 
              onClick={() => setShowProfileSetup(true)}
              className="text-white/70 hover:text-white transition-colors"
            >
              ⚙️
            </button>
          </div>
          
                    <div className="text-center">            <div className="text-sm opacity-75 mb-1">              {weatherData?.weather.name ?                 `${weatherData.weather.name}${weatherData.weather.sys?.country ? `, ${weatherData.weather.sys.country}` : ''}` :                 'Current Location'              }            </div>            <div className="text-3xl font-bold mb-2">              {Math.round(weatherData?.weather.main.temp ?? 0)}°C            </div>            <div className="text-sm capitalize">              {weatherData?.weather.weather[0]?.description}            </div>          </div>
        </div>

        {/* UV Index Display */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">UV Index</h2>
            <div className={`text-6xl font-bold mb-2 ${getUVIndexColor(weatherData?.uv.value ?? 0)}`}>
              {weatherData?.uv.value?.toFixed(1) ?? '0.0'}
            </div>
            
            {protection && (
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-white text-sm font-medium ${getUVLevelColor(protection.level)}`}>
                {protection.level.toUpperCase()} RISK
              </div>
            )}
          </div>
        </div>

        {/* Protection Timeline */}
        {protection && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Protection Timeline</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {formatTime(protection.safeExposureTime)}
                </div>
                <div className="text-sm text-gray-600">Time to Burn</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {vitaminDTime === Infinity ? 'N/A' : `${vitaminDTime}m`}
                </div>
                <div className="text-sm text-gray-600">Vitamin D Time</div>
              </div>
            </div>

            {protection.reapplyTime && (
              <div className="bg-blue-50 rounded-2xl p-4">
                <div className="flex items-center justify-center">
                  <span className="text-blue-600 mr-2">🧴</span>
                  <span className="text-sm text-blue-700">
                    Reapply sunscreen every {protection.reapplyTime / 60}h
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {protection && protection.recommendations.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Recommendations</h3>
            <div className="space-y-3">
                            {protection.recommendations.map((rec: string, index: number) => (                <div key={index} className="flex items-start space-x-3">                  <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>                  <p className="text-sm text-gray-600 leading-relaxed">{rec}</p>                </div>              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-blue-500 text-white p-3 rounded-2xl text-sm font-medium hover:bg-blue-600 transition-colors">
              📱 Set Reminder
            </button>
            <button className="bg-green-500 text-white p-3 rounded-2xl text-sm font-medium hover:bg-green-600 transition-colors">
              🌅 Check Forecast
            </button>
            <button 
              onClick={() => setShowProfileSetup(true)}
              className="bg-purple-500 text-white p-3 rounded-2xl text-sm font-medium hover:bg-purple-600 transition-colors"
            >
              ⚙️ Settings
            </button>
            <button className="bg-orange-500 text-white p-3 rounded-2xl text-sm font-medium hover:bg-orange-600 transition-colors">
              📊 Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Profile Setup Component
function ProfileSetup({ onSave }: { onSave: (profile: ProfileData) => void }) {
  const [skinType, setSkinType] = useState(2);
  const [sunscreenUsage, setSunscreenUsage] = useState(1);
  const [timeOutdoors, setTimeOutdoors] = useState(2);
  const [environment, setEnvironment] = useState(1);

  const handleSave = () => {
    onSave({
      skinType,
      sunscreenUsage,
      timeOutdoors,
      environment
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-4">
      <div className="container mx-auto max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Profile Setup</h2>
          
          {/* Skin Type */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Skin Type</h3>
            <div className="space-y-2">
                            {SKIN_TYPES.map((type, index: number) => (                <label key={index} className="flex items-center space-x-3 cursor-pointer">                  <input                    type="radio"                    value={index}                    checked={skinType === index}                    onChange={(e) => setSkinType(parseInt(e.target.value))}                    className="w-4 h-4 text-blue-600"                  />                  <span className="text-sm text-gray-600">                    Type {type.type}: {type.description}                  </span>                </label>              ))}
            </div>
          </div>

          {/* Sunscreen Usage */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Sunscreen Usage</h3>
            <div className="space-y-2">
              {['No sunscreen', 'SPF 15-29', 'SPF 30-49', 'SPF 50+'].map((spf, index) => (
                <label key={index} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    value={index}
                    checked={sunscreenUsage === index}
                    onChange={(e) => setSunscreenUsage(parseInt(e.target.value))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-600">{spf}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Time Outdoors */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Planned Time Outdoors</h3>
            <div className="space-y-2">
              {['<30 minutes', '30-60 minutes', '1-2 hours', '2-3 hours', '>3 hours'].map((time, index) => (
                <label key={index} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    value={index}
                    checked={timeOutdoors === index}
                    onChange={(e) => setTimeOutdoors(parseInt(e.target.value))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-600">{time}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Environment */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Environment</h3>
            <div className="space-y-2">
              {['Shaded areas', 'Mixed sun/shade', 'Direct sunlight', 'Water/beach/sand', 'Snow/ice'].map((env, index) => (
                <label key={index} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    value={index}
                    checked={environment === index}
                    onChange={(e) => setEnvironment(parseInt(e.target.value))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-600">{env}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-blue-500 text-white py-3 rounded-2xl font-semibold hover:bg-blue-600 transition-colors"
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
} 