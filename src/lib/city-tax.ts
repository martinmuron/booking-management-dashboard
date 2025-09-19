const TAX_PER_PERSON_PER_NIGHT = 50;
const MINIMUM_TAX_AGE = 18;
const PRAGUE_KEYWORDS = ['prague', 'praha'];

export { TAX_PER_PERSON_PER_NIGHT };

export interface CityTaxGuestInput {
  dateOfBirth?: Date | string | null;
  residenceCity?: string | null;
}

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
  referenceDate: Date = new Date()
): number => {
  if (!Array.isArray(guests) || nights <= 0) {
    return 0;
  }

  const eligibleGuestCount = guests.reduce((count, guest) => {
    const dateOfBirth = toDateOrNull(guest.dateOfBirth ?? null);
    const age = calculateAge(dateOfBirth, referenceDate);
    const isAdult = typeof age === 'number' && age >= MINIMUM_TAX_AGE;
    const exempt = isPragueCityTaxExempt(guest.residenceCity);

    return count + (isAdult && !exempt ? 1 : 0);
  }, 0);

  return eligibleGuestCount * nights * TAX_PER_PERSON_PER_NIGHT;
};

export const calculateCityTaxForStay = <T extends CityTaxGuestInput>(
  guests: T[],
  checkInDate: Date | string,
  checkOutDate: Date | string,
  referenceDate: Date = new Date()
): number => {
  const nights = calculateNights(checkInDate, checkOutDate);
  return calculateCityTaxForGuests(guests, nights, referenceDate);
};
