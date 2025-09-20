"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StripePayment from "@/components/ui/stripe-payment";
import {
  Calendar,
  Users,
  CreditCard,
  Key,
  MapPin,
  Clock,
  User,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Home,
  Wifi,
  Video,
  Navigation,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import {
  calculateCityTaxForGuests,
  isPragueCityTaxExempt
} from "@/lib/city-tax";

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  dateOfBirth: string;
  nationality: string;
  citizenship: string;
  residenceCountry: string;
  residenceCity: string;
  residenceAddress: string;
  purposeOfStay: string;
  documentType: string;
  documentNumber: string;
  visaNumber: string;
  notes: string;
}

interface VirtualKey {
  id: string;
  keyType: string;
  nukiKeyId: string;
  isActive: boolean;
  createdAt: string;
  deactivatedAt?: string;
}

interface BookingData {
  id: string;
  propertyName: string;
  propertyAddress?: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  roomNumber?: string;
  guestLeaderName: string;
  cityTaxAmount: number;
  cityTaxPerPerson: number;
  universalKeypadCode?: string;
  virtualKeys?: VirtualKey[];
}

interface CheckinClientProps {
  initialBooking?: BookingData;
}

type ApiGuestPayload = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  citizenship?: string | null;
  residenceCountry?: string | null;
  residenceCity?: string | null;
  residenceAddress?: string | null;
  purposeOfStay?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  visaNumber?: string | null;
  notes?: string | null;
};

const NAME_CHAR_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/u;
const ISO_ALPHA3_REGEX = /^[A-Z]{3}$/;
const DOCUMENT_NUMBER_REGEX = /^[A-Z0-9]{4,30}$/;

const countrySuggestions = [
  { code: 'CZE', name: 'Czech Republic' },
  { code: 'SVK', name: 'Slovakia' },
  { code: 'AUT', name: 'Austria' },
  { code: 'DEU', name: 'Germany' },
  { code: 'POL', name: 'Poland' },
  { code: 'HUN', name: 'Hungary' },
  { code: 'USA', name: 'United States' },
  { code: 'GBR', name: 'United Kingdom' },
  { code: 'FRA', name: 'France' },
  { code: 'ITA', name: 'Italy' },
  { code: 'ESP', name: 'Spain' },
  { code: 'CAN', name: 'Canada' },
  { code: 'AUS', name: 'Australia' },
  { code: 'JPN', name: 'Japan' }
];

const documentTypes = [
  { code: 'PASSPORT', name: 'Passport' },
  { code: 'ID_CARD', name: 'National ID Card' },
  { code: 'RESIDENCE_PERMIT', name: 'Residence Permit' },
  { code: 'DRIVERS_LICENSE', name: "Driver's License" },
  { code: 'OTHER', name: 'Other Official Document' }
];

// Country codes for phone numbers
const phoneCodes = [
  { code: '+420', country: 'CZ', name: 'Czech Republic' },
  { code: '+1', country: 'US', name: 'United States' },
  { code: '+44', country: 'UK', name: 'United Kingdom' },
  { code: '+49', country: 'DE', name: 'Germany' },
  { code: '+33', country: 'FR', name: 'France' },
  { code: '+39', country: 'IT', name: 'Italy' },
  { code: '+34', country: 'ES', name: 'Spain' },
  { code: '+31', country: 'NL', name: 'Netherlands' },
  { code: '+43', country: 'AT', name: 'Austria' },
  { code: '+32', country: 'BE', name: 'Belgium' },
  { code: '+41', country: 'CH', name: 'Switzerland' },
  { code: '+48', country: 'PL', name: 'Poland' },
  { code: '+36', country: 'HU', name: 'Hungary' },
  { code: '+421', country: 'SK', name: 'Slovakia' },
  { code: '+86', country: 'CN', name: 'China' },
  { code: '+91', country: 'IN', name: 'India' },
  { code: '+7', country: 'RU', name: 'Russia' },
];

// Purpose of stay options (Czech Police official codes)
const purposeOfStayOptions = [
  { value: '00', label: '00 - ZDRAVOTNÍ (Medical)' },
  { value: '01', label: '01 - TURISTICKÝ (Tourism)' },
  { value: '02', label: '02 - OBCHODNÍ (Business)' },
  { value: '03', label: '03 - SLUŽEBNÍ (Official business)' },
  { value: '04', label: '04 - STUDIJNÍ (Study/Education)' },
  { value: '05', label: '05 - PRACOVNÍ (Work)' },
  { value: '06', label: '06 - KULTURNÍ (Cultural)' },
  { value: '07', label: '07 - SPORTOVNÍ (Sports)' },
  { value: '08', label: '08 - NÁVŠTĚVA PŘÍBUZNÝCH (Family visit)' },
  { value: '09', label: '09 - TRANZITNÍ (Transit)' },
  { value: '10', label: '10 - JINÝ (Other)' },
  { value: '99', label: '99 - OSTATNÍ / JINÉ (Other/Unknown)' }
];

const sanitizeString = (value: string) => value?.trim() ?? '';

const sanitizeIsoAlpha3 = (value: string) => sanitizeString(value).toUpperCase();

const sanitizeDocumentNumber = (value: string) => sanitizeString(value).toUpperCase();

type GuestErrors = Partial<Record<keyof Guest, string>>;

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function CheckinClient({ initialBooking }: CheckinClientProps) {
  const params = useParams();
  const bookingToken = params.bookingId as string;

  const [loading, setLoading] = useState(!initialBooking);
  const [booking, setBooking] = useState<BookingData | null>(initialBooking || null);
  const [error, setError] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestErrors, setGuestErrors] = useState<Record<string, GuestErrors>>({});
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentIntentAmount, setPaymentIntentAmount] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeSection, setActiveSection] = useState('booking-details');

  // Refs for sections
  const bookingDetailsRef = useRef<HTMLDivElement>(null);
  const guestRegistrationRef = useRef<HTMLDivElement>(null);
  const cityTaxRef = useRef<HTMLDivElement>(null);
  const arrivalRef = useRef<HTMLDivElement>(null);
  const appliancesRef = useRef<HTMLDivElement>(null);
  const aroundRef = useRef<HTMLDivElement>(null);
  const virtualKeysRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (sectionId: string) => {
    const refs: { [key: string]: React.RefObject<HTMLDivElement | null> } = {
      'booking-details': bookingDetailsRef,
      'guest-registration': guestRegistrationRef,
      'city-tax': cityTaxRef,
      'arrival': arrivalRef,
      'appliances': appliancesRef,
      'around-you': aroundRef,
      'virtual-keys': virtualKeysRef
    };

    const ref = refs[sectionId];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
      setShowMobileMenu(false);
    }
  };

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        { id: 'booking-details', ref: bookingDetailsRef },
        { id: 'guest-registration', ref: guestRegistrationRef },
        { id: 'city-tax', ref: cityTaxRef },
        { id: 'arrival', ref: arrivalRef },
        { id: 'appliances', ref: appliancesRef },
        { id: 'around-you', ref: aroundRef },
        { id: 'virtual-keys', ref: virtualKeysRef }
      ];

      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        if (section.ref.current) {
          const { offsetTop, offsetHeight } = section.ref.current;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!initialBooking) {
      // Fetch booking data if not provided by server
      const fetchBooking = async () => {
        try {
          const response = await fetch(`/api/check-in?token=${bookingToken}`);
          const data = await response.json();

          if (data.success) {
            const fetchedBooking = data.data.booking as BookingData & { guests?: ApiGuestPayload[] };
            setBooking(fetchedBooking);

            const fetchedGuests = ((fetchedBooking.guests || []) as ApiGuestPayload[]).map((guest, index) => ({
              id: guest.id || `${Date.now()}-${index}`,
              firstName: guest.firstName || '',
              lastName: guest.lastName || '',
              email: guest.email ?? '',
              phone: guest.phone ?? '',
              phoneCountryCode: guest.phoneCountryCode ?? '+420',
              dateOfBirth: guest.dateOfBirth ? new Date(guest.dateOfBirth).toISOString().split('T')[0] : '',
              nationality: guest.nationality ?? '',
              citizenship: guest.citizenship ?? '',
              residenceCountry: guest.residenceCountry ?? '',
              residenceCity: guest.residenceCity ?? '',
              residenceAddress: guest.residenceAddress ?? '',
              purposeOfStay: guest.purposeOfStay ?? '',
              documentType: guest.documentType ?? '',
              documentNumber: guest.documentNumber ?? '',
              visaNumber: guest.visaNumber ?? '',
              notes: guest.notes ?? ''
            }));

            if (fetchedGuests.length > 0) {
              setGuests(fetchedGuests);
              setGuestErrors(fetchedGuests.reduce<Record<string, GuestErrors>>((acc, guest) => {
                acc[guest.id] = {};
                return acc;
              }, {}));
            } else {
              const fallbackGuest: Guest = {
                id: '1',
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                phoneCountryCode: '+420',
                dateOfBirth: '',
                nationality: '',
                citizenship: '',
                residenceCountry: '',
                residenceCity: '',
                residenceAddress: '',
                purposeOfStay: '',
                documentType: '',
                documentNumber: '',
                visaNumber: '',
                notes: ''
              };
              setGuests([fallbackGuest]);
              setGuestErrors({ [fallbackGuest.id]: {} });
            }
          } else {
            setError(data.error || 'Failed to load booking');
          }
        } catch (err) {
          console.error('Failed to fetch booking details', err);
          setError('Network error: Unable to load booking details');
        } finally {
          setLoading(false);
        }
      };

      fetchBooking();
    } else {
      // Initialize guests from the booking data
      const guestName = initialBooking.guestLeaderName || 'Guest';
      const nameParts = guestName.split(' ');
      const defaultGuest: Guest = {
        id: '1',
        firstName: nameParts[0] || 'Guest',
        lastName: nameParts.slice(1).join(' ') || '',
        email: '',
        phone: '',
        phoneCountryCode: '+420',
        dateOfBirth: '',
        nationality: '',
        citizenship: '',
        residenceCountry: '',
        residenceCity: '',
        residenceAddress: '',
        purposeOfStay: '',
        documentType: '',
        documentNumber: '',
        visaNumber: '',
        notes: ''
      };

      setGuests([defaultGuest]);
      setGuestErrors({ [defaultGuest.id]: {} });
    }
  }, [bookingToken, initialBooking]);

  const addGuest = () => {
    const newGuest: Guest = {
      id: Date.now().toString(),
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      phoneCountryCode: '+420',
      dateOfBirth: '',
      nationality: '',
      citizenship: '',
      residenceCountry: '',
      residenceCity: '',
      residenceAddress: '',
      purposeOfStay: '',
      documentType: '',
      documentNumber: '',
      visaNumber: '',
      notes: ''
    };
    setGuests([...guests, newGuest]);
    setGuestErrors((prev) => ({ ...prev, [newGuest.id]: {} }));
  };

  const removeGuest = (guestId: string) => {
    if (guests.length > 1) {
      setGuests(guests.filter(g => g.id !== guestId));
      setGuestErrors((prev) => {
        const updated = { ...prev };
        delete updated[guestId];
        return updated;
      });
    }
  };

  const applyFieldSanitizers = (field: keyof Guest, value: string): string => {
    if (field === 'nationality' || field === 'citizenship' || field === 'residenceCountry') {
      return sanitizeIsoAlpha3(value);
    }

    if (field === 'documentNumber') {
      return sanitizeDocumentNumber(value);
    }

    if (field === 'visaNumber') {
      return sanitizeString(value).toUpperCase();
    }

    if (field === 'notes') {
      return sanitizeString(value);
    }

    return value;
  };

  const updateGuest = (guestId: string, field: keyof Guest, value: string) => {
    setGuests(prevGuests => prevGuests.map(guest => {
      if (guest.id === guestId) {
        const sanitizedValue = applyFieldSanitizers(field, value);
        const updatedGuest = { ...guest, [field]: sanitizedValue };

        if (field === 'nationality' && !sanitizedValue) {
          updatedGuest.documentType = '';
        }

        const validation = validateGuest(updatedGuest);
        setGuestErrors(prev => ({ ...prev, [guestId]: validation }));

        return updatedGuest;
      }
      return guest;
    }));
  };

  const validateGuest = (guest: Guest): GuestErrors => {
    const errors: GuestErrors = {};

    const firstName = sanitizeString(guest.firstName);
    const lastName = sanitizeString(guest.lastName);
    const dateOfBirth = sanitizeString(guest.dateOfBirth);
    const nationality = sanitizeIsoAlpha3(guest.nationality);
    const residenceCountry = sanitizeIsoAlpha3(guest.residenceCountry);
    const residenceCity = sanitizeString(guest.residenceCity);
    const residenceAddress = sanitizeString(guest.residenceAddress);
    const documentNumber = sanitizeDocumentNumber(guest.documentNumber);
    const purposeOfStay = sanitizeString(guest.purposeOfStay);

    if (!firstName) {
      errors.firstName = 'First name is required';
    } else if (!NAME_CHAR_REGEX.test(firstName)) {
      errors.firstName = "Only letters, spaces, apostrophes and hyphens are allowed";
    }

    if (!lastName) {
      errors.lastName = 'Last name is required';
    } else if (!NAME_CHAR_REGEX.test(lastName)) {
      errors.lastName = "Only letters, spaces, apostrophes and hyphens are allowed";
    }

    if (!dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    } else {
      const parsed = new Date(dateOfBirth);
      const today = new Date();
      if (Number.isNaN(parsed.getTime())) {
        errors.dateOfBirth = 'Invalid date';
      } else if (parsed > today) {
        errors.dateOfBirth = 'Date of birth cannot be in the future';
      }
    }

    if (!nationality) {
      errors.nationality = 'Nationality (ISO 3166-1 alpha-3) is required';
    } else if (!ISO_ALPHA3_REGEX.test(nationality)) {
      errors.nationality = 'Use three uppercase letters (e.g. USA, CZE)';
    }

    if (guest.citizenship && !ISO_ALPHA3_REGEX.test(sanitizeIsoAlpha3(guest.citizenship))) {
      errors.citizenship = 'Citizenship must be a three-letter ISO code';
    }

    if (!residenceCountry) {
      errors.residenceCountry = 'Residence country is required';
    } else if (!ISO_ALPHA3_REGEX.test(residenceCountry)) {
      errors.residenceCountry = 'Use three uppercase letters (e.g. USA, CZE)';
    }

    if (!residenceCity) {
      errors.residenceCity = 'Residence city is required';
    }

    if (!residenceAddress) {
      errors.residenceAddress = 'Residence address is required';
    } else if (residenceAddress.length > 128) {
      errors.residenceAddress = 'Maximum 128 characters';
    }

    if (!purposeOfStay) {
      errors.purposeOfStay = 'Purpose of stay is required';
    } else if (!/^\d{2}$/.test(purposeOfStay)) {
      errors.purposeOfStay = 'Use a two-digit purpose code';
    }

    if (!guest.documentType) {
      errors.documentType = 'Document type is required';
    }

    if (!documentNumber) {
      errors.documentNumber = 'Document number is required';
    } else if (!DOCUMENT_NUMBER_REGEX.test(documentNumber)) {
      errors.documentNumber = '4-30 characters (letters and numbers only)';
    }

    if (guest.visaNumber) {
      const sanitizedVisa = sanitizeString(guest.visaNumber).toUpperCase();
      if (sanitizedVisa.length > 15) {
        errors.visaNumber = 'Maximum 15 characters';
      }
    }

    if (documentNumber === 'INPASS' && !sanitizeString(guest.notes)) {
      errors.notes = 'Notes are required when using INPASS';
    }

    if (guest.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email)) {
      errors.email = 'Enter a valid email address';
    }

    if (guest.phone && !/^[0-9+()\s-]{6,20}$/.test(guest.phone)) {
      errors.phone = 'Enter a valid phone number';
    }

    return errors;
  };

  const validateAllGuests = (guestList: Guest[]) => {
    const validationMap: Record<string, GuestErrors> = {};
    let isValid = true;

    guestList.forEach((guest) => {
      const errors = validateGuest(guest);
      validationMap[guest.id] = errors;
      if (Object.keys(errors).length > 0) {
        isValid = false;
      }
    });

    setGuestErrors(validationMap);
    return isValid;
  };

  const nights = useMemo(() => {
    if (!booking) {
      return 0;
    }

    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    const diff = checkOut.getTime() - checkIn.getTime();

    if (Number.isNaN(diff) || diff <= 0) {
      return 0;
    }

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [booking]);

  const cityTaxAmount = useMemo(
    () => calculateCityTaxForGuests(guests, nights),
    [guests, nights]
  );

  useEffect(() => {
    if (cityTaxAmount === 0) {
      setPaymentCompleted(true);
      setPaymentIntentId(null);
      setPaymentIntentAmount(null);
      setShowPaymentForm(false);
      return;
    }

    if (paymentIntentAmount === null) {
      setPaymentCompleted(false);
      return;
    }

    if (paymentIntentAmount !== cityTaxAmount) {
      setPaymentCompleted(false);
      setPaymentIntentId(null);
      setPaymentIntentAmount(null);
      setShowPaymentForm(false);
    }
  }, [cityTaxAmount, paymentIntentAmount]);

  const handlePaymentSuccess = (intentId: string, amountPaid: number) => {
    setPaymentIntentId(intentId);
    setPaymentIntentAmount(amountPaid);
    setPaymentCompleted(true);
    setShowPaymentForm(false);
    setError(null);
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(`Payment failed: ${errorMessage}`);
    setShowPaymentForm(true);
    setPaymentIntentId(null);
    setPaymentIntentAmount(null);
    setPaymentCompleted(false);
  };

  const initiatePayment = () => {
    setShowPaymentForm(true);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!paymentCompleted) {
      setError('Please complete payment before submitting');
      return;
    }

    const isValid = validateAllGuests(guests);

    if (!isValid) {
      setError('Please fix the highlighted guest details before submitting.');
      return;
    }

    const normalizedGuests = guests.map((guest) => {
      const sanitizedNationality = sanitizeIsoAlpha3(guest.nationality);
      const sanitizedCitizenship = guest.citizenship ? sanitizeIsoAlpha3(guest.citizenship) : sanitizedNationality;
      const sanitizedResidenceCountry = sanitizeIsoAlpha3(guest.residenceCountry);
      const sanitizedPhoneCode = sanitizeString(guest.phoneCountryCode) || '+420';
      const normalizedPhoneCode = sanitizedPhoneCode.startsWith('+') ? sanitizedPhoneCode : `+${sanitizedPhoneCode}`;

      return {
        ...guest,
        firstName: sanitizeString(guest.firstName),
        lastName: sanitizeString(guest.lastName),
        email: sanitizeString(guest.email),
        phone: sanitizeString(guest.phone),
        phoneCountryCode: normalizedPhoneCode,
        nationality: sanitizedNationality,
        citizenship: sanitizedCitizenship,
        residenceCountry: sanitizedResidenceCountry,
        residenceCity: sanitizeString(guest.residenceCity),
        residenceAddress: sanitizeString(guest.residenceAddress),
        purposeOfStay: sanitizeString(guest.purposeOfStay),
        documentType: sanitizeString(guest.documentType).toUpperCase(),
        documentNumber: sanitizeDocumentNumber(guest.documentNumber),
        visaNumber: sanitizeString(guest.visaNumber).toUpperCase(),
        notes: sanitizeString(guest.notes)
      };
    });

    setSubmitting(true);
    try {
      const response = await fetch('/api/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: bookingToken,
          guests: normalizedGuests,
          paymentIntentId: paymentIntentId
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Check-in completed successfully!');
        setError(null);
        setGuestErrors({});
      } else {
        setError(data.error || 'Failed to complete check-in');
      }
    } catch {
      setError('Failed to complete check-in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading your booking...</span>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Check-in Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error || 'Booking not found. Please check your check-in link.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const firstName = booking.guestLeaderName.split(' ')[0] || 'Guest';

  const aroundAddress = booking.propertyAddress || booking.roomNumber || booking.propertyName || 'Prague, Czechia';
  const mapsQuery = encodeURIComponent(aroundAddress);
  const mapsEmbedUrl = `https://maps.google.com/maps?q=${mapsQuery}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  const mapsExternalUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  const navigationItems = [
    { id: 'booking-details', label: 'Booking Details', icon: MapPin },
    { id: 'guest-registration', label: 'Guest Registration', icon: User },
    { id: 'city-tax', label: 'City Tax Payment', icon: CreditCard },
    { id: 'arrival', label: 'Arrival Instructions', icon: Home },
    { id: 'appliances', label: 'Appliances & WiFi', icon: Wifi },
    { id: 'around-you', label: 'Around You', icon: Navigation },
    { id: 'virtual-keys', label: 'Virtual Keys', icon: Key }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="bg-background shadow-lg border-2"
        >
          {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block w-64 fixed left-0 top-0 bottom-0 bg-background border-r overflow-y-auto">
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-6">Check-in Navigation</h3>
            <nav className="space-y-1">
              {navigationItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeSection === item.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-left">{item.label}</span>
                    {activeSection === item.id && <ChevronRight className="h-4 w-4 ml-auto" />}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 lg:ml-64">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="text-center mb-6 lg:mb-8 mt-16 lg:mt-0">
                <div className="lg:mx-0 mx-8">
                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                    Hello {firstName}, we are looking forward to your stay!
                  </h1>
                  <p className="text-sm lg:text-base text-muted-foreground">
                    Please complete your check-in below. Provide the required information to complete your stay.
                  </p>
                </div>
              </div>

              {error && (
                <Card className="mb-4 lg:mb-6 border-red-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-2 text-red-600">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span className="text-sm lg:text-base">{error}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Booking Information */}
              <div ref={bookingDetailsRef}>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MapPin className="mr-2 h-5 w-5" />
                      Booking Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{booking.propertyName}</h3>
                        {booking.propertyAddress && (
                          <p className="text-sm text-muted-foreground mb-3">{booking.propertyAddress}</p>
                        )}
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="mr-2 h-4 w-4" />
                            Check-in: {formatDate(booking.checkInDate)} at {formatTime(booking.checkInDate)}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="mr-2 h-4 w-4" />
                            Check-out: {formatDate(booking.checkOutDate)} at {formatTime(booking.checkOutDate)}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="mr-2 h-4 w-4" />
                            {nights} {nights === 1 ? 'night' : 'nights'}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center mb-2">
                          <Users className="mr-2 h-4 w-4" />
                          <span className="font-medium">{booking.numberOfGuests} Guests</span>
                        </div>
                        <Badge variant="outline">Booking ID: {booking.id}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Guest Registration */}
              <div ref={guestRegistrationRef}>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="mr-2 h-5 w-5" />
                      Guest Registration
                    </CardTitle>
                    <CardDescription>
                      Please provide information for all guests (required by local regulations)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {guests.map((guest, index) => {
                        const errors = guestErrors[guest.id] || {};
                        return (
                          <Card key={guest.id} className="border-2">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                              Guest {index + 1} {index === 0 && '(Lead Guest)'}
                            </CardTitle>
                            {guests.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeGuest(guest.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </CardHeader>
                          <CardContent className="pt-2">
                            {/* Basic Information Section */}
                            <div>
                              <h5 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Basic Information</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`firstName-${guest.id}`}>First Name *</Label>
                                  <Input
                                    id={`firstName-${guest.id}`}
                                    value={guest.firstName}
                                    onChange={(e) => updateGuest(guest.id, 'firstName', e.target.value)}
                                    required
                                    maxLength={64}
                                    aria-invalid={!!errors.firstName}
                                    className={errors.firstName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                  />
                                  {errors.firstName && (
                                    <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor={`lastName-${guest.id}`}>Last Name *</Label>
                                  <Input
                                    id={`lastName-${guest.id}`}
                                    value={guest.lastName}
                                    onChange={(e) => updateGuest(guest.id, 'lastName', e.target.value)}
                                    required
                                    maxLength={64}
                                    aria-invalid={!!errors.lastName}
                                    className={errors.lastName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                  />
                                  {errors.lastName && (
                                    <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor={`email-${guest.id}`}>Email Address</Label>
                                  <Input
                                    id={`email-${guest.id}`}
                                    type="email"
                                    value={guest.email}
                                    onChange={(e) => updateGuest(guest.id, 'email', e.target.value)}
                                    maxLength={128}
                                    aria-invalid={!!errors.email}
                                    className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                  />
                                  {errors.email && (
                                    <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor={`phone-${guest.id}`}>Phone Number</Label>
                                  <div className="flex gap-2">
                                    <Select
                                      value={guest.phoneCountryCode}
                                      onValueChange={(value) => updateGuest(guest.id, 'phoneCountryCode', value)}
                                    >
                                      <SelectTrigger className="w-24">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {phoneCodes.map(code => (
                                          <SelectItem key={code.code} value={code.code}>
                                            {code.code}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      id={`phone-${guest.id}`}
                                      value={guest.phone}
                                      onChange={(e) => updateGuest(guest.id, 'phone', e.target.value)}
                                      className={`flex-1 ${errors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                      maxLength={20}
                                      aria-invalid={!!errors.phone}
                                    />
                                  </div>
                                  {errors.phone && (
                                    <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor={`dateOfBirth-${guest.id}`}>Date of Birth *</Label>
                                  <Input
                                    id={`dateOfBirth-${guest.id}`}
                                    type="date"
                                    value={guest.dateOfBirth}
                                    onChange={(e) => updateGuest(guest.id, 'dateOfBirth', e.target.value)}
                                    required
                                    aria-invalid={!!errors.dateOfBirth}
                                    className={errors.dateOfBirth ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                  />
                                  {errors.dateOfBirth && (
                                    <p className="mt-1 text-xs text-red-600">{errors.dateOfBirth}</p>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor={`nationality-${guest.id}`}>Nationality (ISO Alpha-3) *</Label>
                                  <Input
                                    id={`nationality-${guest.id}`}
                                    value={guest.nationality}
                                    onChange={(e) => updateGuest(guest.id, 'nationality', e.target.value)}
                                    placeholder="e.g. CZE, USA"
                                    maxLength={3}
                                    aria-invalid={!!errors.nationality}
                                    className={`uppercase ${errors.nationality ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    list={`nationality-suggestions-${guest.id}`}
                                  />
                                  <datalist id={`nationality-suggestions-${guest.id}`}>
                                    {countrySuggestions.map(country => (
                                      <option key={country.code} value={country.code}>{country.name}</option>
                                    ))}
                                  </datalist>
                                  {errors.nationality && (
                                    <p className="mt-1 text-xs text-red-600">{errors.nationality}</p>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor={`citizenship-${guest.id}`}>Citizenship (ISO Alpha-3)</Label>
                                  <Input
                                    id={`citizenship-${guest.id}`}
                                    value={guest.citizenship}
                                    onChange={(e) => updateGuest(guest.id, 'citizenship', e.target.value)}
                                    placeholder="Defaults to nationality if blank"
                                    maxLength={3}
                                    aria-invalid={!!errors.citizenship}
                                    className={`uppercase ${errors.citizenship ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    list={`citizenship-suggestions-${guest.id}`}
                                  />
                                  <datalist id={`citizenship-suggestions-${guest.id}`}>
                                    {countrySuggestions.map(country => (
                                      <option key={country.code} value={country.code}>{country.name}</option>
                                    ))}
                                  </datalist>
                                  {errors.citizenship && (
                                    <p className="mt-1 text-xs text-red-600">{errors.citizenship}</p>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor={`purposeOfStay-${guest.id}`}>Purpose of Stay *</Label>
                                  <Select
                                    value={guest.purposeOfStay}
                                    onValueChange={(value) => updateGuest(guest.id, 'purposeOfStay', value)}
                                  >
                                    <SelectTrigger aria-invalid={!!errors.purposeOfStay}>
                                      <SelectValue placeholder="Select purpose" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {purposeOfStayOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {errors.purposeOfStay && (
                                    <p className="mt-1 text-xs text-red-600">{errors.purposeOfStay}</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Residence Information Section */}
                            <div>
                              <h5 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Residence Information</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`residenceCountry-${guest.id}`}>Residence Country *</Label>
                                  <Input
                                    id={`residenceCountry-${guest.id}`}
                                    value={guest.residenceCountry}
                                    onChange={(e) => updateGuest(guest.id, 'residenceCountry', e.target.value)}
                                    placeholder="ISO alpha-3 code"
                                    maxLength={3}
                                    aria-invalid={!!errors.residenceCountry}
                                    className={`uppercase ${errors.residenceCountry ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    list={`residence-suggestions-${guest.id}`}
                                  />
                                  <datalist id={`residence-suggestions-${guest.id}`}>
                                    {countrySuggestions.map(country => (
                                      <option key={country.code} value={country.code}>{country.name}</option>
                                    ))}
                                  </datalist>
                                  {errors.residenceCountry && (
                                    <p className="mt-1 text-xs text-red-600">{errors.residenceCountry}</p>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor={`residenceCity-${guest.id}`}>Residence City *</Label>
                                  <Input
                                    id={`residenceCity-${guest.id}`}
                                    value={guest.residenceCity}
                                    onChange={(e) => updateGuest(guest.id, 'residenceCity', e.target.value)}
                                    required
                                    maxLength={64}
                                    aria-invalid={!!errors.residenceCity}
                                    className={errors.residenceCity ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                  />
                                  {isPragueCityTaxExempt(guest.residenceCity) && (
                                    <p className="text-sm text-green-600 mt-1">✓ Prague resident - City tax exempt</p>
                                  )}
                                  {errors.residenceCity && (
                                    <p className="mt-1 text-xs text-red-600">{errors.residenceCity}</p>
                                  )}
                                </div>
                                <div className="md:col-span-2">
                                  <Label htmlFor={`residenceAddress-${guest.id}`}>Residence Address *</Label>
                                  <Input
                                    id={`residenceAddress-${guest.id}`}
                                    value={guest.residenceAddress}
                                    onChange={(e) => updateGuest(guest.id, 'residenceAddress', e.target.value)}
                                    placeholder="Enter full address"
                                    required
                                    maxLength={128}
                                    aria-invalid={!!errors.residenceAddress}
                                    className={errors.residenceAddress ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                  />
                                  {errors.residenceAddress && (
                                    <p className="mt-1 text-xs text-red-600">{errors.residenceAddress}</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Document Information Section */}
                            <div>
                              <h5 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Document Information</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`documentType-${guest.id}`}>Document Type *</Label>
                                  <Select
                                    value={guest.documentType}
                                    onValueChange={(value) => updateGuest(guest.id, 'documentType', value)}
                                  >
                                    <SelectTrigger aria-invalid={!!errors.documentType}>
                                      <SelectValue placeholder="Select document type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {documentTypes.map(docType => (
                                        <SelectItem key={docType.code} value={docType.code}>
                                          {docType.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {errors.documentType && (
                                    <p className="mt-1 text-xs text-red-600">{errors.documentType}</p>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor={`documentNumber-${guest.id}`}>Document Number *</Label>
                                  <Input
                                    id={`documentNumber-${guest.id}`}
                                    value={guest.documentNumber}
                                    onChange={(e) => updateGuest(guest.id, 'documentNumber', e.target.value)}
                                    required
                                    maxLength={30}
                                    aria-invalid={!!errors.documentNumber}
                                    className={`uppercase ${errors.documentNumber ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                  />
                                  {errors.documentNumber && (
                                    <p className="mt-1 text-xs text-red-600">{errors.documentNumber}</p>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor={`visaNumber-${guest.id}`}>Visa Number (if applicable)</Label>
                                  <Input
                                    id={`visaNumber-${guest.id}`}
                                    value={guest.visaNumber}
                                    onChange={(e) => updateGuest(guest.id, 'visaNumber', e.target.value)}
                                    placeholder="Enter visa number if applicable"
                                    maxLength={15}
                                    aria-invalid={!!errors.visaNumber}
                                    className={`uppercase ${errors.visaNumber ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                  />
                                  {errors.visaNumber && (
                                    <p className="mt-1 text-xs text-red-600">{errors.visaNumber}</p>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor={`notes-${guest.id}`}>Additional Notes</Label>
                                  <Input
                                    id={`notes-${guest.id}`}
                                    value={guest.notes}
                                    onChange={(e) => updateGuest(guest.id, 'notes', e.target.value)}
                                    placeholder="Any additional information"
                                    maxLength={255}
                                    aria-invalid={!!errors.notes}
                                    className={errors.notes ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                  />
                                  {errors.notes && (
                                    <p className="mt-1 text-xs text-red-600">{errors.notes}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                          </Card>
                        );
                      })}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={addGuest}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Guest
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* City Tax Payment */}
              <div ref={cityTaxRef}>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="mr-2 h-5 w-5" />
                      Prague City Tax
                    </CardTitle>
                    <CardDescription>
                      Required payment for visitors to Prague (50 CZK per person per night, 18+ only)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!paymentCompleted ? (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Total tax amount: <strong>{cityTaxAmount} CZK</strong>
                        </p>
                        {showPaymentForm ? (
                          <StripePayment
                            amount={cityTaxAmount}
                            bookingId={booking.id}
                            guestCount={guests.length}
                            onSuccess={handlePaymentSuccess}
                            onError={handlePaymentError}
                          />
                        ) : (
                          <Button onClick={initiatePayment} disabled={cityTaxAmount === 0}>
                            Pay Prague City Tax ({cityTaxAmount} CZK)
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span>
                          {cityTaxAmount > 0
                            ? 'City tax payment completed successfully!'
                            : 'No city tax payment required.'}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Arrival Instructions */}
              <div ref={arrivalRef}>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Home className="mr-2 h-5 w-5" />
                      Arrival Instructions
                    </CardTitle>
                    <CardDescription>
                      Please refer to the attached videos for step-by-step guidance on how to access the building and your apartment.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="font-semibold text-sm">1.</span>
                          <div>
                            <p className="font-medium text-sm mb-1">Building Address:</p>
                            <p className="text-sm text-muted-foreground">Prokopova 9, Praha 3</p>
                            <a
                              href="https://maps.app.goo.gl/u5SknAkE3UzwqJHQA"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-1"
                            >
                              <Navigation className="h-3 w-3" />
                              View on Google Maps
                            </a>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="font-semibold text-sm">2.</span>
                          <div>
                            <p className="font-medium text-sm mb-1">Building and Apartment Access:</p>
                            <a
                              href="https://www.canva.com/design/DAGn4TgtpAE/VD31ZY0LuhpOvtmhslAhcA/watch?utm_content=DAGn4TgtpAE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h56f84bb570"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                              <Video className="h-3 w-3" />
                              Entry Video Instructions
                            </a>
                            <p className="text-sm text-muted-foreground mt-2">
                              Enter the access code provided to unlock the building entrance.
                              When you arrive at your apartment, use the same code (in most cases) to unlock the door.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-900">
                          📎 Click the links above to watch the video with detailed instructions.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Appliances + WiFi */}
              <div ref={appliancesRef}>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Wifi className="mr-2 h-5 w-5" />
                      Appliances + WiFi
                    </CardTitle>
                    <CardDescription>
                      For info on how to use the appliances, click on the links below:
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-muted p-4 rounded-lg">
                          <h5 className="font-medium text-sm mb-2">🧺 Laundry Room</h5>
                          <a
                            href="https://www.canva.com/design/DAGn6WOlOo8/fbbNy2mwyb9rrEgGjvtnBA/watch?utm_content=DAGn6WOlOo8&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h6be36fd300"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Click here to see how to use the laundry facilities
                          </a>
                        </div>

                        <div className="bg-muted p-4 rounded-lg">
                          <h5 className="font-medium text-sm mb-2">🍳 Stove</h5>
                          <a
                            href="https://www.canva.com/design/DAGn6T3LDIE/8-WwGx9YdY-B_5C3_lAOIg/watch?utm_content=DAGn6T3LDIE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hd3fc76a88f"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Click here for instructions on how to use the stove
                          </a>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h5 className="font-medium text-sm mb-2 flex items-center">
                          <Wifi className="h-4 w-4 mr-2" />
                          WiFi Connection
                        </h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs text-gray-600">Network:</span>
                            <p className="font-mono font-semibold">prokopka</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-600">Password:</span>
                            <p className="font-mono font-semibold">72727272</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Around You */}
              <div ref={aroundRef}>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Navigation className="mr-2 h-5 w-5" />
                      Around You
                    </CardTitle>
                    <CardDescription>
                      Explore dining, coffee, and sights near your stay.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="aspect-video w-full overflow-hidden rounded-lg border">
                        <iframe
                          title={`Map of ${aroundAddress}`}
                          src={mapsEmbedUrl}
                          className="h-full w-full"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm text-muted-foreground">
                          Use the map to discover nearby restaurants, bars, and attractions. Tap below to open Google Maps with recommendations around your address.
                        </p>
                        <Button asChild variant="outline">
                          <a href={mapsExternalUrl} target="_blank" rel="noopener noreferrer">
                            <Navigation className="mr-2 h-4 w-4" />
                            Open in Google Maps
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Virtual Keys */}
              <div ref={virtualKeysRef}>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Key className="mr-2 h-5 w-5" />
                      Your Access Code
                    </CardTitle>
                    <CardDescription>
                      {booking?.universalKeypadCode
                        ? 'Your universal keypad code for all doors'
                        : 'Digital keys will be available after check-in completion'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {booking?.universalKeypadCode ? (
                      <div className="space-y-6">
                        {/* Universal Code Display */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 text-center">
                          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                            <Key className="h-8 w-8 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-blue-900 mb-2">Your Universal Access Code</h3>
                          <div className="text-4xl font-bold text-blue-800 font-mono mb-2 tracking-wider">
                            {booking.universalKeypadCode}
                          </div>
                          <p className="text-sm text-blue-600 mb-4">
                            Use this code on all keypads to access your areas
                          </p>
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active Now
                          </Badge>
                        </div>

                        {/* Instructions */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <h4 className="font-medium text-amber-900 mb-2 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            How to Use Your Code
                          </h4>
                          <ol className="text-sm text-amber-800 space-y-1">
                            <li>1. Find the keypad on the door</li>
                            <li>2. Enter your 6-digit code: <span className="font-mono font-bold">{booking.universalKeypadCode}</span></li>
                            <li>3. Press the unlock button or wait for auto-unlock</li>
                            <li>4. Turn the handle to open the door</li>
                          </ol>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted p-6 rounded-lg text-center">
                        <Key className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                        <h4 className="font-medium mb-2">Access Code Not Yet Available</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Your universal access code will be generated automatically once you complete
                          the check-in process and payment.
                        </p>
                        <Badge className="bg-blue-100 text-blue-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending Check-in Completion
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Submit Button */}
              <Card>
                <CardContent className="pt-6">
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !paymentCompleted}
                    className="w-full"
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Completing Check-in...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Complete Check-in
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
