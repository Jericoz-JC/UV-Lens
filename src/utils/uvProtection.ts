import { useState, useEffect } from 'react';

export interface SkinType {
  type: number;
  description: string;
  baseBurnTime: number; // minutes at UV index 1
}

export interface Environment {
  type: 'shady' | 'mixed' | 'sunny' | 'water_sand' | 'snow';
  reflectionFactor: number;
}

export interface ProfileData {
  skinType: number; // 0-4
  sunscreenUsage: number; // 0-3
  timeOutdoors: number; // 0-4
  environment?: number; // 0-4
  timeOfDay?: number; // optional
}

// Skin type definitions based on Fitzpatrick scale
export const SKIN_TYPES: SkinType[] = [
  { type: 1, description: 'Always burns, never tans', baseBurnTime: 67 },
  { type: 2, description: 'Usually burns, tans minimally', baseBurnTime: 100 },
  { type: 3, description: 'Sometimes burns, tans moderately', baseBurnTime: 133 },
  { type: 4, description: 'Rarely burns, tans easily', baseBurnTime: 200 },
  { type: 5, description: 'Never burns, tans very easily', baseBurnTime: 300 }
];

// SPF values for sunscreen options
export const SPF_VALUES = [1, 15, 30, 50]; // No sunscreen, SPF 15-29, SPF 30-49, SPF 50+

// Time outdoors in minutes
export const TIME_OUTDOORS = [30, 45, 90, 150, 240]; // <30min, 30-60min, 1-2hr, 2-3hr, >3hr

// Environmental reflection factors
export const ENVIRONMENTS: Environment[] = [
  { type: 'shady', reflectionFactor: 0.8 },
  { type: 'mixed', reflectionFactor: 1.0 },
  { type: 'sunny', reflectionFactor: 1.1 },
  { type: 'water_sand', reflectionFactor: 1.25 },
  { type: 'snow', reflectionFactor: 1.85 }
];

export class UVProtectionCalculator {
  /**
   * Calculate the effective UV index based on environment
   */
  static calculateEffectiveUV(actualUV: number, environment = 1): number {
    const envFactor = ENVIRONMENTS[environment]?.reflectionFactor ?? 1.0;
    return actualUV * envFactor;
  }

  /**
   * Calculate time to burn in minutes
   */
  static calculateTimeToBurn(
    skinType: number,
    uvIndex: number,
    spfValue = 1
  ): number {
    const skin = SKIN_TYPES[skinType];
    if (!skin || uvIndex <= 0) return Infinity;

    // Base burn time adjusted for UV index
    const burnTimeWithoutProtection = skin.baseBurnTime / uvIndex;
    
    // Apply SPF protection
    const burnTimeWithProtection = burnTimeWithoutProtection * spfValue;
    
    return Math.round(burnTimeWithProtection);
  }

  /**
   * Calculate protection level and recommendations
   */
  static calculateProtectionLevel(
    profile: ProfileData,
    currentUV: number,
    forecastUV: number[] = []
  ): {
    level: 'low' | 'moderate' | 'high' | 'extreme';
    score: number;
    recommendations: string[];
    reapplyTime?: number;
    safeExposureTime: number;
  } {
    // Get effective UV considering environment
    const effectiveUV = this.calculateEffectiveUV(
      currentUV,
      profile.environment ?? 1
    );

    // Get max UV in the forecast period
    const maxForecastUV = Math.max(currentUV, ...forecastUV);
    const maxEffectiveUV = this.calculateEffectiveUV(
      maxForecastUV,
      profile.environment ?? 1
    );

    // Calculate time to burn with safe defaults
    const spfValue = SPF_VALUES[profile.sunscreenUsage] ?? 1;
    const timeToBurn = this.calculateTimeToBurn(
      profile.skinType,
      maxEffectiveUV,
      spfValue
    );

    // Get planned time outdoors with safe default
    const plannedMinutes = TIME_OUTDOORS[profile.timeOutdoors] ?? 90;

    // Calculate protection score (0-100)
    let score = 0;
    const recommendations: string[] = [];
    let level: 'low' | 'moderate' | 'high' | 'extreme';
    let reapplyTime: number | undefined;

    // UV Index based scoring
    if (effectiveUV < 3) {
      score += 20;
    } else if (effectiveUV < 6) {
      score += 40;
    } else if (effectiveUV < 8) {
      score += 60;
    } else if (effectiveUV < 11) {
      score += 80;
    } else {
      score += 100;
    }

    // Exposure time risk
    const exposureRatio = plannedMinutes / timeToBurn;
    if (exposureRatio > 1) {
      score += 40;
      recommendations.push('Your planned time exceeds safe exposure. Consider reducing time outdoors.');
    } else if (exposureRatio > 0.7) {
      score += 20;
      recommendations.push('You\'re approaching your safe exposure limit.');
    }

    // Skin type sensitivity
    if (profile.skinType <= 1) {
      score += 20;
      recommendations.push('Your skin type is highly sensitive to UV.');
    }

    // Determine protection level
    if (score >= 80) {
      level = 'extreme';
      recommendations.unshift('⚠️ EXTREME UV RISK - Avoid sun exposure if possible');
      if (spfValue < 50) {
        recommendations.push('Apply SPF 50+ sunscreen immediately');
      }
      recommendations.push('Wear protective clothing, hat, and sunglasses');
      recommendations.push('Seek shade frequently');
      reapplyTime = 60; // Reapply every hour
    } else if (score >= 60) {
      level = 'high';
      recommendations.unshift('🔴 HIGH UV RISK - Maximum protection needed');
      if (spfValue < 30) {
        recommendations.push('Apply at least SPF 30 sunscreen');
      }
      recommendations.push('Wear a wide-brimmed hat');
      recommendations.push('Stay in shade during peak hours (10am-4pm)');
      reapplyTime = 90; // Reapply every 1.5 hours
    } else if (score >= 40 || effectiveUV >= 3) {
      level = 'moderate';
      recommendations.unshift('🟡 MODERATE UV RISK - Protection recommended');
      if (spfValue < 15) {
        recommendations.push('Apply SPF 15+ sunscreen');
      }
      recommendations.push('Wear sunglasses');
      recommendations.push('Consider seeking shade during midday');
      reapplyTime = 120; // Reapply every 2 hours
    } else {
      level = 'low';
      recommendations.unshift('🟢 LOW UV RISK - Minimal protection needed');
      recommendations.push('Sunglasses recommended');
      if (profile.skinType <= 1) {
        recommendations.push('Light sunscreen still advisable for sensitive skin');
      }
    }

    // Add reapplication reminders
    if (spfValue > 1 && reapplyTime) {
      recommendations.push(`Reapply sunscreen every ${reapplyTime / 60} hours`);
      if (profile.environment === 3 || profile.environment === 4) {
        recommendations.push('Reapply immediately after swimming or sweating');
      }
    }

    return {
      level,
      score: Math.min(100, Math.round(score)),
      recommendations,
      reapplyTime,
      safeExposureTime: timeToBurn
    };
  }

  /**
   * Get personalized UV threshold alerts
   */
  static getUVThresholds(skinType: number): {
    safe: number;
    caution: number;
    danger: number;
  } {
    // More sensitive skin types have lower thresholds
    const baseThresholds = {
      safe: 3,
      caution: 6,
      danger: 8
    };

    const adjustments = [
      { safe: -1, caution: -2, danger: -2 }, // Type 1
      { safe: -0.5, caution: -1, danger: -1 }, // Type 2
      { safe: 0, caution: 0, danger: 0 }, // Type 3
      { safe: 0.5, caution: 1, danger: 1 }, // Type 4
      { safe: 1, caution: 2, danger: 2 } // Type 5
    ];

    const adjustment = adjustments[skinType] ?? adjustments[2]!;

    return {
      safe: Math.max(1, baseThresholds.safe + adjustment.safe),
      caution: Math.max(2, baseThresholds.caution + adjustment.caution),
      danger: Math.max(3, baseThresholds.danger + adjustment.danger)
    };
  }

  /**
   * Calculate vitamin D production time
   */
  static calculateVitaminDTime(
    skinType: number,
    uvIndex: number,
    bodyExposure = 0.25 // Default 25% body exposure
  ): number {
    // Approximate time in minutes to produce adequate vitamin D
    // Based on research for 1000 IU vitamin D production
    const skinTypeFactors = [0.5, 0.7, 1.0, 1.5, 2.0]; // Lighter skin produces vitamin D faster
    const factor = skinTypeFactors[skinType] ?? 1.0;
    
    if (uvIndex < 3) {
      return Infinity; // Too low for significant vitamin D production
    }
    
    const baseTime = 15; // Base time at UV index 3 with 25% body exposure
    const time = (baseTime * factor * 3) / (uvIndex * bodyExposure * 4);
    
    return Math.round(Math.max(5, Math.min(30, time))); // Cap between 5-30 minutes
  }
}

// Custom hook for UV protection
export const useUVProtection = (
  profile: ProfileData | null,
  currentUV: number,
  hourlyForecast: number[]
) => {
  const [protection, setProtection] = useState<ReturnType<typeof UVProtectionCalculator.calculateProtectionLevel> | null>(null);
  const [vitaminDTime, setVitaminDTime] = useState(0);
  const [thresholds, setThresholds] = useState<ReturnType<typeof UVProtectionCalculator.getUVThresholds> | null>(null);

  useEffect(() => {
    if (currentUV !== undefined && profile) {
      // Get next 2 hours of UV data
      const next2Hours = hourlyForecast.slice(0, 2);
      
      // Calculate protection level
      const protectionData = UVProtectionCalculator.calculateProtectionLevel(
        profile,
        currentUV,
        next2Hours
      );
      setProtection(protectionData);

      // Calculate vitamin D time
      const vitD = UVProtectionCalculator.calculateVitaminDTime(
        profile.skinType,
        currentUV
      );
      setVitaminDTime(vitD);

      // Get personalized thresholds
      const thresh = UVProtectionCalculator.getUVThresholds(profile.skinType);
      setThresholds(thresh);
    }
  }, [profile, currentUV, hourlyForecast]);

  return { protection, vitaminDTime, thresholds };
};

// Notification scheduler for reapplication reminders
export class UVNotificationScheduler {
  static scheduleReapplicationReminder(minutes: number): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      setTimeout(() => {
        new Notification('Time to reapply sunscreen! ☀️', {
          body: 'Protect your skin by reapplying sunscreen now.',
          icon: '/icon-192.png',
          badge: '/badge-72.png'
        });
      }, minutes * 60 * 1000);
    }
  }

  static async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
} 