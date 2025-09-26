const TAX_PER_PERSON_PER_NIGHT = 50;
const MINIMUM_TAX_AGE = 18;
const PRAGUE_KEYWORDS = ['prague', 'praha'];

type PropertyMatcher = string[];

interface CityTaxContext {
  propertyName?: string | null;
  propertyAddress?: string | null;
}

export interface CityTaxPolicy {
  taxPerPersonPerNight: number;
  pragueExemptionApplies: boolean;
  cityName: string | null;
}

export interface CityTaxOptions extends CityTaxContext {
  referenceDate?: Date;
}

export interface CityTaxGuestInput {
  dateOfBirth?: Date | string | null;
  residenceCity?: string | null;
}

type PropertySpecificPolicy = CityTaxPolicy & { matchers: PropertyMatcher };

const DEFAULT_CITY_TAX_POLICY: CityTaxPolicy = {
  taxPerPersonPerNight: TAX_PER_PERSON_PER_NIGHT,
  pragueExemptionApplies: true,
  cityName: 'Prague'
};

const PROPERTY_SPECIFIC_POLICIES: PropertySpecificPolicy[] = [
  {
    matchers: ['bezrucova 67', 'bezručova 67'],
    taxPerPersonPerNight: 21,
    pragueExemptionApplies: false,
    cityName: 'Mikulov'
  }
];

export { TAX_PER_PERSON_PER_NIGHT };

const toDateOrNull = (value: Date | string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const calculateAge = (dateOfBirth: Date | null, referenceDate: Date): number | null => {
  if (!dateOfBirth) {
    return null;
  }

  let age = referenceDate.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = referenceDate.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }

  return age;
};

const normalizeValue = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
};

const matchesPolicy = (policy: PropertySpecificPolicy, context: CityTaxContext): boolean => {
  const normalizedValues = [context.propertyName, context.propertyAddress]
    .map(normalizeValue)
    .filter((value): value is string => Boolean(value));

  if (normalizedValues.length === 0) {
    return false;
  }

  return policy.matchers.some((matcher) => {
    const normalizedMatcher = normalizeValue(matcher);
    if (!normalizedMatcher) {
      return false;
    }

    return normalizedValues.some((value) => value.includes(normalizedMatcher));
  });
};

export const getCityTaxPolicy = (context: CityTaxContext = {}): CityTaxPolicy => {
  const matchedPolicy = PROPERTY_SPECIFIC_POLICIES.find((policy) => matchesPolicy(policy, context));

  if (!matchedPolicy) {
    return DEFAULT_CITY_TAX_POLICY;
  }

  return {
    taxPerPersonPerNight: matchedPolicy.taxPerPersonPerNight,
    pragueExemptionApplies: matchedPolicy.pragueExemptionApplies,
    cityName: matchedPolicy.cityName
  };
};

export const isPragueCityTaxExempt = (residenceCity?: string | null): boolean => {
  if (!residenceCity) {
    return false;
  }

  const normalized = residenceCity.trim().toLowerCase();
  return PRAGUE_KEYWORDS.some(keyword => normalized.includes(keyword));
};

export const calculateNights = (checkInDate: Date | string, checkOutDate: Date | string): number => {
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const diff = end.getTime() - start.getTime();
  if (diff <= 0) {
    return 0;
  }

  const nights = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 0;
};

export const calculateCityTaxForGuests = <T extends CityTaxGuestInput>(
  guests: T[],
  nights: number,
  options: CityTaxOptions = {}
): number => {
  if (!Array.isArray(guests) || nights <= 0) {
    return 0;
  }

  const policy = getCityTaxPolicy(options);
  const referenceDate = options.referenceDate ?? new Date();

  const eligibleGuestCount = guests.reduce((count, guest) => {
    const dateOfBirth = toDateOrNull(guest.dateOfBirth ?? null);
    const age = calculateAge(dateOfBirth, referenceDate);
    const isAdult = age === null ? true : age >= MINIMUM_TAX_AGE;
    const exempt = policy.pragueExemptionApplies ? isPragueCityTaxExempt(guest.residenceCity) : false;

    return count + (isAdult && !exempt ? 1 : 0);
  }, 0);

  return eligibleGuestCount * nights * policy.taxPerPersonPerNight;
};

export const calculateCityTaxForStay = <T extends CityTaxGuestInput>(
  guests: T[],
  checkInDate: Date | string,
  checkOutDate: Date | string,
  options: CityTaxOptions = {}
): number => {
  const nights = calculateNights(checkInDate, checkOutDate);
  return calculateCityTaxForGuests(guests, nights, options);
};
