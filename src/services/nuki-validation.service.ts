import { nukiService } from './nuki.service';

interface CodeValidationResult {
  isValid: boolean;
  isActive: boolean;
  deviceCount: number;
  lastChecked: string;
  error?: string;
  details?: {
    foundInDevices: string[];
    foundInAuthorizations: string[];
    inactiveDevices: string[];
    errorDevices: string[];
  };
}

interface ValidationCacheEntry {
  result: CodeValidationResult;
  timestamp: number;
  expiresAt: number;
}

class NukiValidationService {
  // Cache validation results for 5 minutes to avoid excessive API calls
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private validationCache = new Map<string, ValidationCacheEntry>();

  /**
   * Validate that a universal keypad code is active on Nuki devices
   * @param code - The 6-digit universal keypad code
   * @returns validation result with detailed status
   */
  async validateUniversalKeypadCode(code: string): Promise<CodeValidationResult> {
    try {
      console.log(`🔍 Validating universal keypad code: ${code}`);

      // Check cache first
      const cached = this.getCachedValidation(code);
      if (cached) {
        console.log(`✅ Using cached validation for code: ${code}`);
        return cached;
      }

      // Fetch all Nuki devices and authorizations
      const [devices, authorizations] = await Promise.all([
        nukiService.getAllDevices(),
        nukiService.getAllAuthorizations()
      ]);

      const result: CodeValidationResult = {
        isValid: false,
        isActive: false,
        deviceCount: devices.length,
        lastChecked: new Date().toISOString(),
        details: {
          foundInDevices: [],
          foundInAuthorizations: [],
          inactiveDevices: [],
          errorDevices: []
        }
      };

      // Check authorizations for the code
      const matchingAuths = authorizations.filter(auth =>
        auth.code === code &&
        auth.type === 13 // Keypad code type
      );

      if (matchingAuths.length === 0) {
        result.error = `Code ${code} not found in any Nuki authorizations`;
        this.setCachedValidation(code, result);
        return result;
      }

      console.log(`📋 Found ${matchingAuths.length} matching authorizations for code: ${code}`);

      // Check each authorization
      for (const auth of matchingAuths) {
        if (!auth.enabled) {
          console.log(`⚠️ Authorization ${auth.id} is disabled for code: ${code}`);
          continue;
        }

        // Check if authorization is within date range (if specified)
        const now = new Date();
        if (auth.allowedFromDate && new Date(auth.allowedFromDate) > now) {
          console.log(`⚠️ Authorization ${auth.id} not yet active (starts: ${auth.allowedFromDate})`);
          continue;
        }

        if (auth.allowedUntilDate && new Date(auth.allowedUntilDate) < now) {
          console.log(`⚠️ Authorization ${auth.id} expired (ended: ${auth.allowedUntilDate})`);
          continue;
        }

        result.details!.foundInAuthorizations.push(`Auth ${auth.id} (${auth.name})`);

        // Check devices associated with this authorization
        for (const deviceId of auth.smartlockIds || []) {
          const device = devices.find(d => d.smartlockId === deviceId);
          if (!device) {
            result.details!.errorDevices.push(`Device ${deviceId} not found`);
            continue;
          }

          result.details!.foundInDevices.push(`${device.name} (ID: ${deviceId})`);

          // Check if device is online and functional
          if (device.serverState !== 0) { // 0 = Online
            console.log(`⚠️ Device ${device.name} is offline (state: ${device.serverStateName})`);
            result.details!.inactiveDevices.push(`${device.name} (${device.serverStateName})`);
            continue;
          }

          // Check battery status
          if (device.batteryCritical || device.keypadBatteryCritical) {
            console.log(`⚠️ Device ${device.name} has critical battery`);
            result.details!.inactiveDevices.push(`${device.name} (critical battery)`);
            continue;
          }

          // If we get here, the device is functional
          result.isValid = true;
          result.isActive = true;
        }
      }

      // Final validation
      if (result.details!.foundInAuthorizations.length > 0) {
        result.isValid = true;
        // isActive is set above if any device is functional
      }

      console.log(`✅ Validation complete for code ${code}: valid=${result.isValid}, active=${result.isActive}`);

      // Cache the result
      this.setCachedValidation(code, result);

      return result;

    } catch (error) {
      console.error(`❌ Error validating keypad code ${code}:`, error);

      const errorResult: CodeValidationResult = {
        isValid: false,
        isActive: false,
        deviceCount: 0,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };

      // Cache error results for shorter time (1 minute)
      this.setCachedValidation(code, errorResult, 60 * 1000);

      return errorResult;
    }
  }

  /**
   * Validate multiple codes at once
   * @param codes - Array of keypad codes to validate
   * @returns Map of code to validation result
   */
  async validateMultipleCodes(codes: string[]): Promise<Map<string, CodeValidationResult>> {
    const results = new Map<string, CodeValidationResult>();

    // Process codes in parallel
    const validations = codes.map(async (code) => {
      const result = await this.validateUniversalKeypadCode(code);
      return { code, result };
    });

    const completed = await Promise.all(validations);

    for (const { code, result } of completed) {
      results.set(code, result);
    }

    return results;
  }

  /**
   * Get cached validation result if still valid
   */
  private getCachedValidation(code: string): CodeValidationResult | null {
    const cached = this.validationCache.get(code);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.result;
    }

    // Remove expired cache entry
    if (cached) {
      this.validationCache.delete(code);
    }

    return null;
  }

  /**
   * Cache validation result
   */
  private setCachedValidation(code: string, result: CodeValidationResult, customDuration?: number): void {
    const duration = customDuration || this.CACHE_DURATION;
    const cacheEntry: ValidationCacheEntry = {
      result,
      timestamp: Date.now(),
      expiresAt: Date.now() + duration
    };

    this.validationCache.set(code, cacheEntry);

    // Clean up old cache entries periodically
    if (this.validationCache.size > 100) {
      this.cleanupCache();
    }
  }

  /**
   * Remove expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.validationCache.entries()) {
      if (now >= entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.validationCache.delete(key);
    }

    console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`);
  }

  /**
   * Clear all cached validations (for testing/debugging)
   */
  clearCache(): void {
    this.validationCache.clear();
    console.log('🗑️ Cleared all validation cache');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ code: string; timestamp: number; expiresAt: number }> } {
    return {
      size: this.validationCache.size,
      entries: Array.from(this.validationCache.entries()).map(([code, entry]) => ({
        code: code.substring(0, 3) + '***', // Partially hide codes for security
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt
      }))
    };
  }
}

export const nukiValidationService = new NukiValidationService();
export type { CodeValidationResult };