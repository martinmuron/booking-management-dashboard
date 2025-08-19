"use client";

import { useState, useEffect, useRef } from "react";
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
  ShoppingBag,
  Heart,
  Video,
  Navigation,
  Utensils,
  Building2,
  Mountain,
  Activity,
  Menu,
  X,
  ChevronRight
} from "lucide-react";

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

// Country and nationality data (Czech Police 3-letter codes)
const countries = [
  { code: 'CZE', name: 'Czech Republic' },
  { code: 'USA', name: 'United States' },
  { code: 'GBR', name: 'United Kingdom' },
  { code: 'DEU', name: 'Germany' },
  { code: 'FRA', name: 'France' },
  { code: 'ITA', name: 'Italy' },
  { code: 'ESP', name: 'Spain' },
  { code: 'NLD', name: 'Netherlands' },
  { code: 'AUT', name: 'Austria' },
  { code: 'BEL', name: 'Belgium' },
  { code: 'CHE', name: 'Switzerland' },
  { code: 'POL', name: 'Poland' },
  { code: 'HUN', name: 'Hungary' },
  { code: 'SVK', name: 'Slovakia' },
  { code: 'CAN', name: 'Canada' },
  { code: 'AUS', name: 'Australia' },
  { code: 'JPN', name: 'Japan' },
  { code: 'KOR', name: 'South Korea' },
  { code: 'CHN', name: 'China' },
  { code: 'BRA', name: 'Brazil' },
  { code: 'MEX', name: 'Mexico' },
  { code: 'IND', name: 'India' },
  { code: 'RUS', name: 'Russia' },
  { code: 'TUR', name: 'Turkey' },
  { code: 'SAU', name: 'Saudi Arabia' },
  { code: 'ARE', name: 'United Arab Emirates' },
  { code: 'AFG', name: 'Afghanistan' },
  { code: 'ZWE', name: 'Zimbabwe' },
];

// Document types by nationality (updated for Czech Police codes)
const documentTypesByNationality: Record<string, Array<{ code: string; name: string }>> = {
  'CZE': [
    { code: 'ID_CARD', name: 'ID Card' },
    { code: 'PASSPORT', name: 'Passport' },
    { code: 'DRIVERS_LICENSE', name: 'Driver\'s License' }
  ],
  'USA': [
    { code: 'PASSPORT', name: 'Passport' },
    { code: 'DRIVERS_LICENSE', name: 'Driver\'s License' },
    { code: 'STATE_ID', name: 'State ID' }
  ],
  'GBR': [
    { code: 'PASSPORT', name: 'Passport' },
    { code: 'DRIVERS_LICENSE', name: 'Driving Licence' },
    { code: 'ID_CARD', name: 'ID Card' }
  ],
  'DEU': [
    { code: 'ID_CARD', name: 'Personalausweis' },
    { code: 'PASSPORT', name: 'Reisepass' },
    { code: 'DRIVERS_LICENSE', name: 'Führerschein' }
  ],
  'FRA': [
    { code: 'ID_CARD', name: 'Carte d\'identité' },
    { code: 'PASSPORT', name: 'Passeport' },
    { code: 'DRIVERS_LICENSE', name: 'Permis de conduire' }
  ],
  'ITA': [
    { code: 'ID_CARD', name: 'Carta d\'identità' },
    { code: 'PASSPORT', name: 'Passaporto' },
    { code: 'DRIVERS_LICENSE', name: 'Patente' }
  ],
  // Default for other countries
  'DEFAULT': [
    { code: 'PASSPORT', name: 'Passport' },
    { code: 'ID_CARD', name: 'National ID Card' },
    { code: 'DRIVERS_LICENSE', name: 'Driver\'s License' }
  ]
};

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

// Helper function to get document types for a nationality
const getDocumentTypesForNationality = (nationality: string) => {
  return documentTypesByNationality[nationality] || documentTypesByNationality['DEFAULT'];
};

// Helper function to check if Prague city tax exemption applies
const isPragueCityTaxExempt = (residenceCity: string): boolean => {
  return residenceCity.toLowerCase().includes('prague') || residenceCity.toLowerCase().includes('praha');
};

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

const calculateAge = (dateOfBirth: string): number => {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const calculateCityTax = (guests: Guest[], nights: number): number => {
  const TAX_PER_PERSON_PER_NIGHT = 50; // 50 CZK
  const MIN_AGE_FOR_TAX = 18;
  
  const eligibleGuests = guests.filter(guest => {
    const age = calculateAge(guest.dateOfBirth);
    const isOfAge = age >= MIN_AGE_FOR_TAX;
    const isNotPragueResident = !isPragueCityTaxExempt(guest.residenceCity);
    return isOfAge && isNotPragueResident;
  });
  
  return eligibleGuests.length * nights * TAX_PER_PERSON_PER_NIGHT;
};

export default function CheckInPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
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
  const localInterestRef = useRef<HTMLDivElement>(null);
  const restaurantsRef = useRef<HTMLDivElement>(null);
  const shoppingRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const virtualKeysRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (sectionId: string) => {
    const refs: { [key: string]: React.RefObject<HTMLDivElement | null> } = {
      'booking-details': bookingDetailsRef,
      'guest-registration': guestRegistrationRef,
      'city-tax': cityTaxRef,
      'arrival': arrivalRef,
      'appliances': appliancesRef,
      'local-interest': localInterestRef,
      'restaurants': restaurantsRef,
      'shopping': shoppingRef,
      'services': servicesRef,
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
        { id: 'local-interest', ref: localInterestRef },
        { id: 'restaurants', ref: restaurantsRef },
        { id: 'shopping', ref: shoppingRef },
        { id: 'services', ref: servicesRef },
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
    const fetchBooking = async () => {
      try {
        console.log('Fetching booking with token:', bookingId);
        const response = await fetch(`/api/check-in?token=${bookingId}`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', response.status, errorText);
          setError(`Server error: ${response.status} - ${errorText}`);
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log('API Response data:', data);
        
        if (data.success && data.data?.booking) {
          const bookingData = data.data.booking;
          console.log('Processing booking data:', {
            id: bookingData?.id,
            guestLeaderName: bookingData?.guestLeaderName,
            guestLeaderEmail: bookingData?.guestLeaderEmail,
            hasGuests: !!bookingData?.guests,
            guestsLength: bookingData?.guests?.length || 0
          });
          
          // Create booking with safe defaults for all fields
          setBooking({
            id: bookingData?.id || bookingId || 'unknown',
            propertyName: bookingData?.propertyName || 'Property',
            propertyAddress: bookingData?.propertyAddress || undefined,
            checkInDate: bookingData?.checkInDate || new Date().toISOString(),
            checkOutDate: bookingData?.checkOutDate || new Date(Date.now() + 86400000).toISOString(), // +1 day
            numberOfGuests: bookingData?.numberOfGuests || 2,
            guestLeaderName: bookingData?.guestLeaderName || 'Guest',
            cityTaxAmount: 0,
            cityTaxPerPerson: 50
          });
          
          // Initialize with existing guests or one empty guest - with safety checks
          try {
            if (bookingData?.guests && Array.isArray(bookingData.guests) && bookingData.guests.length > 0) {
              setGuests(bookingData.guests.map((guest: Partial<Guest>, index: number) => ({
                id: guest?.id || (Date.now() + index).toString(),
                firstName: guest?.firstName || '',
                lastName: guest?.lastName || '',
                email: guest?.email || '',
                phone: guest?.phone || '',
                phoneCountryCode: guest?.phoneCountryCode || '+420',
                dateOfBirth: guest?.dateOfBirth ? (typeof guest.dateOfBirth === 'string' && guest.dateOfBirth.includes('T') ? guest.dateOfBirth.split('T')[0] : String(guest.dateOfBirth)) : '',
                nationality: guest?.nationality || '',
                citizenship: guest?.citizenship || '',
                residenceCountry: guest?.residenceCountry || '',
                residenceCity: guest?.residenceCity || '',
                residenceAddress: guest?.residenceAddress || '',
                purposeOfStay: guest?.purposeOfStay || '',
                documentType: guest?.documentType || '',
                documentNumber: guest?.documentNumber || '',
                visaNumber: guest?.visaNumber || '',
                notes: guest?.notes || ''
              })));
            } else {
              // Fallback guest creation with safe defaults
              const guestName = bookingData?.guestLeaderName || bookingData?.guestName || 'Guest';
              const nameParts = guestName ? guestName.split(' ') : ['Guest'];
              setGuests([{
                id: '1',
                firstName: nameParts[0] || 'Guest',
                lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '',
                email: bookingData?.guestLeaderEmail || bookingData?.email || '',
                phone: bookingData?.guestLeaderPhone || bookingData?.phone || '',
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
              }]);
            }
          } catch (guestProcessingError) {
            console.warn('Error processing guests, using fallback:', guestProcessingError);
            // Ultimate fallback - just create a basic guest
            setGuests([{
              id: '1',
              firstName: 'Guest',
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
            }]);
          }
          
          // Check if payment already completed
          if (bookingData.payments && bookingData.payments.some((p: { status: string }) => p.status === 'paid')) {
            setPaymentCompleted(true);
          }
        } else {
          console.warn('API returned error, creating fallback booking:', data);
          // Even if API fails, create a basic booking so the page shows
          createFallbackBooking();
        }
        setLoading(false);
      } catch (error) {
        console.error('JavaScript Error in fetchBooking:', error);
        console.log('Creating fallback booking due to error');
        // Always create a fallback booking so the page shows
        createFallbackBooking();
        setLoading(false);
      }
    };

    const createFallbackBooking = () => {
      // Create a basic booking structure so the page always shows
      setBooking({
        id: bookingId || 'unknown',
        propertyName: 'Property',
        propertyAddress: undefined,
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 86400000).toISOString(), // +1 day
        numberOfGuests: 2,
        guestLeaderName: 'Guest',
        cityTaxAmount: 0,
        cityTaxPerPerson: 50
      });
      
      // Create a basic guest
      setGuests([{
        id: '1',
        firstName: 'Guest',
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
      }]);
      
      // Set a user-friendly error message
      setError('Booking details could not be loaded, but you can still fill in your information below.');
    };

    fetchBooking();
  }, [bookingId]);

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
      documentNumber: ''
    };
    setGuests([...guests, newGuest]);
  };

  const removeGuest = (guestId: string) => {
    if (guests.length > 1) {
      setGuests(guests.filter(g => g.id !== guestId));
    }
  };

  const updateGuest = (guestId: string, field: keyof Guest, value: string) => {
    setGuests(guests.map(guest => {
      if (guest.id === guestId) {
        const updatedGuest = { ...guest, [field]: value };
        
        // If nationality changes, reset document type
        if (field === 'nationality') {
          updatedGuest.documentType = '';
        }
        
        return updatedGuest;
      }
      return guest;
    }));
  };


  const handlePaymentSuccess = (intentId: string) => {
    setPaymentIntentId(intentId);
    setPaymentCompleted(true);
    setShowPaymentForm(false);
    setError(null);
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(`Payment failed: ${errorMessage}`);
    setShowPaymentForm(false);
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

    setSubmitting(true);
    try {
      const response = await fetch('/api/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: bookingId,
          guests: guests,
          paymentIntentId: paymentIntentId
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Check-in completed successfully!');
        setError(null);
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

  // Remove the error-only return - we always want to show the form
  // The error will be displayed within the normal page layout
  
  // If still loading and no booking yet, show loading
  if (loading && !booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading your booking...</span>
        </div>
      </div>
    );
  }

  // If no booking after loading (shouldn't happen with fallback), create one
  if (!booking) {
    const fallbackBooking = {
      id: bookingId || 'unknown',
      propertyName: 'Property',
      propertyAddress: undefined,
      checkInDate: new Date().toISOString(),
      checkOutDate: new Date(Date.now() + 86400000).toISOString(),
      numberOfGuests: 2,
      guestLeaderName: 'Guest',
      cityTaxAmount: 0,
      cityTaxPerPerson: 50
    };
    setBooking(fallbackBooking);
    return null; // Will re-render with booking
  }

  const nights = Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24));
  
  // Extract first name from guest leader name for personalized greeting
  const getFirstName = (fullName: string) => {
    if (!fullName || fullName === 'Guest') return 'Guest';
    return fullName.split(' ')[0];
  };
  
  const firstName = getFirstName(booking.guestLeaderName);

  const navigationItems = [
    { id: 'booking-details', label: 'Booking Details', icon: MapPin },
    { id: 'guest-registration', label: 'Guest Registration', icon: User },
    { id: 'city-tax', label: 'City Tax Payment', icon: CreditCard },
    { id: 'arrival', label: 'Arrival Instructions', icon: Home },
    { id: 'appliances', label: 'Appliances & WiFi', icon: Wifi },
    { id: 'local-interest', label: 'Local Attractions', icon: Mountain },
    { id: 'restaurants', label: 'Restaurants & Bars', icon: Utensils },
    { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
    { id: 'services', label: 'Services', icon: Heart },
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

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setShowMobileMenu(false)}>
          <div className="fixed left-0 top-0 bottom-0 w-[280px] max-w-[85vw] bg-background border-r shadow-lg overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-6 pt-2">
                <h3 className="font-semibold text-lg">Navigation</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMobileMenu(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <nav className="space-y-1">
                {navigationItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        activeSection === item.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted active:bg-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span>{item.label}</span>
                      {activeSection === item.id && <ChevronRight className="h-4 w-4 ml-auto" />}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

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
            <div className="px-2 lg:px-0">
            <Card className="mb-4 lg:mb-6 border-red-200">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-2 text-red-600">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm lg:text-base">{error}</span>
                </div>
              </CardContent>
            </Card>
            </div>
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
                {guests.map((guest, index) => (
                  <div key={guest.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">
                        Guest {index + 1} {index === 0 && "(Lead Guest)"}
                      </h4>
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGuest(guest.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-6">
                      {/* Personal Information Section */}
                      <div>
                        <h5 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Personal Information</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`firstName-${guest.id}`}>First Name *</Label>
                            <Input
                              id={`firstName-${guest.id}`}
                              value={guest.firstName}
                              onChange={(e) => updateGuest(guest.id, 'firstName', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor={`lastName-${guest.id}`}>Last Name *</Label>
                            <Input
                              id={`lastName-${guest.id}`}
                              value={guest.lastName}
                              onChange={(e) => updateGuest(guest.id, 'lastName', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor={`dob-${guest.id}`}>Date of Birth *</Label>
                            <Input
                              id={`dob-${guest.id}`}
                              type="date"
                              value={guest.dateOfBirth}
                              onChange={(e) => updateGuest(guest.id, 'dateOfBirth', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor={`nationality-${guest.id}`}>Nationality *</Label>
                            <Select
                              value={guest.nationality}
                              onValueChange={(value) => updateGuest(guest.id, 'nationality', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select nationality" />
                              </SelectTrigger>
                              <SelectContent>
                                {countries.map((country) => (
                                  <SelectItem key={country.code} value={country.code}>
                                    {country.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor={`citizenship-${guest.id}`}>Citizenship *</Label>
                            <Select
                              value={guest.citizenship}
                              onValueChange={(value) => updateGuest(guest.id, 'citizenship', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select citizenship" />
                              </SelectTrigger>
                              <SelectContent>
                                {countries.map((country) => (
                                  <SelectItem key={country.code} value={country.code}>
                                    {country.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor={`purposeOfStay-${guest.id}`}>Purpose of Stay *</Label>
                            <Select
                              value={guest.purposeOfStay}
                              onValueChange={(value) => updateGuest(guest.id, 'purposeOfStay', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select purpose" />
                              </SelectTrigger>
                              <SelectContent>
                                {purposeOfStayOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Residence Information Section */}
                      <div>
                        <h5 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Residence Information</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`residenceCountry-${guest.id}`}>Residence Country *</Label>
                            <Select
                              value={guest.residenceCountry}
                              onValueChange={(value) => updateGuest(guest.id, 'residenceCountry', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                              <SelectContent>
                                {countries.map((country) => (
                                  <SelectItem key={country.code} value={country.code}>
                                    {country.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor={`residenceCity-${guest.id}`}>Residence City *</Label>
                            <Input
                              id={`residenceCity-${guest.id}`}
                              value={guest.residenceCity}
                              onChange={(e) => updateGuest(guest.id, 'residenceCity', e.target.value)}
                              placeholder={guest.residenceCountry === 'CZ' ? "e.g., Praha (Prague residents exempt from city tax)" : "Enter city"}
                              required
                            />
                            {isPragueCityTaxExempt(guest.residenceCity) && (
                              <p className="text-sm text-green-600 mt-1">✓ Prague resident - City tax exempt</p>
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
                            />
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
                              disabled={!guest.nationality}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={guest.nationality ? "Select document type" : "Select nationality first"} />
                              </SelectTrigger>
                              <SelectContent>
                                {getDocumentTypesForNationality(guest.nationality).map((docType) => (
                                  <SelectItem key={docType.code} value={docType.code}>
                                    {docType.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor={`documentNumber-${guest.id}`}>Document Number *</Label>
                            <Input
                              id={`documentNumber-${guest.id}`}
                              value={guest.documentNumber}
                              onChange={(e) => updateGuest(guest.id, 'documentNumber', e.target.value)}
                              placeholder="Min 4, max 30 characters"
                              minLength={4}
                              maxLength={30}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor={`visaNumber-${guest.id}`}>Visa Number</Label>
                            <Input
                              id={`visaNumber-${guest.id}`}
                              value={guest.visaNumber}
                              onChange={(e) => updateGuest(guest.id, 'visaNumber', e.target.value)}
                              placeholder="If applicable (max 15 chars)"
                              maxLength={15}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor={`notes-${guest.id}`}>Notes</Label>
                          <Input
                            id={`notes-${guest.id}`}
                            value={guest.notes}
                            onChange={(e) => updateGuest(guest.id, 'notes', e.target.value)}
                            placeholder="Additional information (max 255 chars)"
                            maxLength={255}
                          />
                        </div>
                      </div>

                      {/* Contact Information Section */}
                      <div>
                        <h5 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Contact Information (Optional)</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`email-${guest.id}`}>Email</Label>
                            <Input
                              id={`email-${guest.id}`}
                              type="email"
                              value={guest.email}
                              onChange={(e) => updateGuest(guest.id, 'email', e.target.value)}
                              placeholder="Enter email address"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`phone-${guest.id}`}>Phone Number</Label>
                            <div className="flex gap-2">
                              <Select
                                value={guest.phoneCountryCode}
                                onValueChange={(value) => updateGuest(guest.id, 'phoneCountryCode', value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {phoneCodes.map((code) => (
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
                                placeholder="Enter phone number"
                                className="flex-1"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {guests.length < booking.numberOfGuests && (
                  <Button
                    variant="outline"
                    onClick={addGuest}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Another Guest
                  </Button>
                )}
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
                City Tax Payment
              </CardTitle>
              <CardDescription>
                Tourist tax payment required by local regulations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>City Tax (50 CZK per person per night for guests 18+, Prague residents exempt)</span>
                      <span className="font-semibold">{calculateCityTax(guests, nights)} CZK</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {guests.filter(g => {
                        const isOfAge = calculateAge(g.dateOfBirth) >= 18;
                        const isNotPragueResident = !isPragueCityTaxExempt(g.residenceCity);
                        return isOfAge && isNotPragueResident;
                      }).length} eligible guests × {nights} nights × 50 CZK
                    </div>
                    {guests.some(g => isPragueCityTaxExempt(g.residenceCity)) && (
                      <div className="text-sm text-green-600">
                        ✓ {guests.filter(g => isPragueCityTaxExempt(g.residenceCity)).length} Prague resident{guests.filter(g => isPragueCityTaxExempt(g.residenceCity)).length !== 1 ? 's' : ''} exempt from city tax
                      </div>
                    )}
                  </div>
                </div>
                
                {paymentCompleted ? (
                  <div className="space-y-2">
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Payment completed successfully
                    </div>
                    {paymentIntentId && (
                      <p className="text-xs text-muted-foreground">
                        Payment ID: {paymentIntentId}
                      </p>
                    )}
                  </div>
                ) : showPaymentForm ? (
                  <div className="space-y-4">
                    <StripePayment
                      amount={calculateCityTax(guests, nights) / 24} // Convert CZK to EUR (approx rate)
                      bookingId={booking.id}
                      guestCount={guests.length}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                    <Button 
                      variant="outline"
                      onClick={() => setShowPaymentForm(false)}
                      className="w-full"
                    >
                      Cancel Payment
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={initiatePayment}
                    className="w-full"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay City Tax ({calculateCityTax(guests, nights)} CZK / €{(calculateCityTax(guests, nights) / 24).toFixed(2)})
                  </Button>
                )}
              </div>
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

          {/* Local Points of Interest */}
          <div ref={localInterestRef}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mountain className="mr-2 h-5 w-5" />
                Local Points of Interest 🇨🇿
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h5 className="font-medium text-sm mb-2">Vitkov Hill</h5>
                  <p className="text-xs text-muted-foreground">
                    Go for the fantastic views of Prague. There is also a military museum and a huge statue of legendary army commander Jan Zizka. At the bottom of the hill is a foot tunnel leading you to Karlin, a very modern district by the river.
                  </p>
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h5 className="font-medium text-sm mb-2">Zizkov Tower</h5>
                  <p className="text-xs text-muted-foreground">
                    Prague&apos;s tallest tower. If you go to the restaurant, you get free entry, so you can enjoy a reasonably priced meal with a great view.
                  </p>
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h5 className="font-medium text-sm mb-2">Jiriho z Podebrad</h5>
                  <p className="text-xs text-muted-foreground">
                    An imposing gothic church, a farmer&apos;s market (Wed-Sat) and endless cafés, JzP is the place to be.
                  </p>
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h5 className="font-medium text-sm mb-2">FK Viktoria Zizkov</h5>
                  <p className="text-xs text-muted-foreground">
                    Sunday, 10:15am there is only one place to be. Soak up the intimate atmosphere at the local football club. Vikotrka, Her, na, nay!
                  </p>
                  <a 
                    href="https://fkzizkov.enigoo.cz/app/tickets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 mt-2 inline-block"
                  >
                    📎 Click here for Tickets
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Restaurants and Bars */}
          <div ref={restaurantsRef}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Utensils className="mr-2 h-5 w-5" />
                Restaurants and Bars 🍽️
              </CardTitle>
              <CardDescription>
                The local restaurants are generally much cheaper than in the centre. Here are some of our favourites:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-medium text-sm">Restaurant 1</h5>
                  <p className="text-xs text-muted-foreground">Local Czech cuisine • $-$$</p>
                </div>
                
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-medium text-sm">Restaurant 2</h5>
                  <p className="text-xs text-muted-foreground">International menu • $$</p>
                </div>
                
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-medium text-sm">Restaurant 3</h5>
                  <p className="text-xs text-muted-foreground">Italian cuisine • $$</p>
                </div>
                
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-medium text-sm">Restaurant 4</h5>
                  <p className="text-xs text-muted-foreground">Asian fusion • $-$$</p>
                </div>
                
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-medium text-sm">Restaurant 5</h5>
                  <p className="text-xs text-muted-foreground">Vegetarian/Vegan • $$</p>
                </div>
                
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-medium text-sm">Bar/Pub 6</h5>
                  <p className="text-xs text-muted-foreground">Craft beers • $</p>
                </div>
                
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-medium text-sm">Café 7</h5>
                  <p className="text-xs text-muted-foreground">Coffee & pastries • $</p>
                </div>
                
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-medium text-sm">Restaurant 8</h5>
                  <p className="text-xs text-muted-foreground">Steakhouse • $$$</p>
                </div>
                
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-medium text-sm">Restaurant 9</h5>
                  <p className="text-xs text-muted-foreground">Seafood • $$-$$$</p>
                </div>
                
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-medium text-sm">Restaurant 10</h5>
                  <p className="text-xs text-muted-foreground">Traditional pub food • $</p>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Shopping */}
          <div ref={shoppingRef}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Shopping
              </CardTitle>
              <CardDescription>
                If Tesco next door doesn&apos;t have what you need, try some of these other options:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Lidl</p>
                    <p className="text-xs text-muted-foreground">Groceries</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Teta</p>
                    <p className="text-xs text-muted-foreground">Beauty products</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Dr. Max Lékárna</p>
                    <p className="text-xs text-muted-foreground">Pharmacy</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Flora Shopping Centre</p>
                    <p className="text-xs text-muted-foreground">Multiple retailers, Cinema</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Zabka</p>
                    <p className="text-xs text-muted-foreground">Small grocery store, 24hrs</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Services */}
          <div ref={servicesRef}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="mr-2 h-5 w-5" />
                Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-sm">💵</span>
                  <div>
                    <p className="font-medium text-sm">Money exchange / 📦 DHL Service</p>
                    <p className="text-xs text-muted-foreground">Mobifon, Seifertova street</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className="text-sm">🏥</span>
                  <div>
                    <p className="font-medium text-sm">Hospital (VFN)</p>
                    <p className="text-xs text-muted-foreground">U Nemocnice 499/2, 128 08 Nové Město</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className="text-sm">🏥</span>
                  <div>
                    <p className="font-medium text-sm">Children&apos;s hospital (FN Motol)</p>
                    <p className="text-xs text-muted-foreground">V Úvalu 84, 150 06 Praha 5</p>
                  </div>
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

                  {/* Door Access List */}
                  <div>
                    <h4 className="font-medium mb-3">Your Code Works On:</h4>
                    <div className="grid gap-3">
                      {[
                        { 
                          name: 'Main Building Entrance', 
                          type: 'MAIN_ENTRANCE',
                          description: 'Entry to the building',
                          icon: Building2
                        },
                        { 
                          name: booking.roomNumber ? `Your Room ${booking.roomNumber}` : `Your Apartment`, 
                          type: 'ROOM',
                          description: 'Your private accommodation',
                          icon: Home
                        },
                        { 
                          name: 'Luggage Room', 
                          type: 'LUGGAGE_ROOM',
                          description: 'Storage area for luggage',
                          icon: ShoppingBag
                        },
                        { 
                          name: 'Laundry Room', 
                          type: 'LAUNDRY_ROOM',
                          description: 'Washing and drying facilities',
                          icon: Activity
                        }
                      ].map((door) => {
                        const virtualKey = booking?.virtualKeys?.find(vk => vk.keyType === door.type);
                        const IconComponent = door.icon;
                        return (
                          <div key={door.type} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                <IconComponent className="h-4 w-4 text-gray-600" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{door.name}</p>
                                <p className="text-xs text-muted-foreground">{door.description}</p>
                              </div>
                            </div>
                            <Badge 
                              className={virtualKey && virtualKey.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {virtualKey && virtualKey.isActive ? 'Active' : 'Pending'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Need Help?</h4>
                    <p className="text-sm text-gray-600">
                      If you have trouble accessing any door, please contact us immediately. 
                      Keep this code private and don&apos;t share it with others.
                    </p>
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

          {/* Submit Button */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handleSubmit}
                disabled={!paymentCompleted || submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Completing Check-in...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Complete Check-in
                  </>
                )}
              </Button>
              
              {!paymentCompleted && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Please complete the city tax payment to proceed
                </p>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
      </div>
    </div>
  );
}