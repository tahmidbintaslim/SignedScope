// Country, time zone and language pickers shared by onboarding and Settings.
import { useMemo } from 'react';
import type { Language } from '../../lib/locale';

// Countries we see most, then the rest of the world by name (Intl.DisplayNames).
export const COUNTRIES = ['TH', 'BD', 'SG', 'VN', 'PH', 'MY', 'ID', 'IN', 'JP', 'KR', 'CN', 'HK', 'TW', 'AU', 'NZ', 'US', 'CA', 'GB', 'IE', 'DE', 'FR', 'NL', 'ES', 'IT', 'PT', 'SE', 'NO', 'DK', 'FI', 'CH', 'AT', 'BE', 'PL', 'AE', 'SA', 'PK', 'LK', 'NP', 'KH', 'LA', 'MM', 'BR', 'MX', 'AR', 'ZA', 'NG', 'KE', 'EG'];
// Main time zone per country, picked when the country changes (people can still choose another).
export const COUNTRY_ZONE: Record<string, string> = { TH: 'Asia/Bangkok', BD: 'Asia/Dhaka', SG: 'Asia/Singapore', VN: 'Asia/Ho_Chi_Minh', PH: 'Asia/Manila', MY: 'Asia/Kuala_Lumpur', ID: 'Asia/Jakarta', IN: 'Asia/Kolkata', JP: 'Asia/Tokyo', KR: 'Asia/Seoul', CN: 'Asia/Shanghai', HK: 'Asia/Hong_Kong', TW: 'Asia/Taipei', AU: 'Australia/Sydney', NZ: 'Pacific/Auckland', US: 'America/New_York', CA: 'America/Toronto', GB: 'Europe/London', IE: 'Europe/Dublin', DE: 'Europe/Berlin', FR: 'Europe/Paris', NL: 'Europe/Amsterdam', ES: 'Europe/Madrid', IT: 'Europe/Rome', AE: 'Asia/Dubai', PK: 'Asia/Karachi', LK: 'Asia/Colombo', NP: 'Asia/Kathmandu', KH: 'Asia/Phnom_Penh', MM: 'Asia/Yangon' };
export const LANG_NAME: Record<Language, string> = { en: 'English', bn: 'বাংলা', th: 'ไทย' };

export function useRegionName(language: string) {
  return useMemo(() => { try { return new Intl.DisplayNames([language], { type: 'region' }); } catch { return null; } }, [language]);
}
/** Every IANA zone, with the current one first if the browser doesn't list it (e.g. "UTC"). */
export function useZones(current: string) {
  return useMemo(() => {
    let list: string[] = [];
    try { list = Intl.supportedValuesOf('timeZone'); } catch { /* old browser */ }
    return list.includes(current) ? list : [current, ...list];
  }, [current]);
}
