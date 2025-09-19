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

interface CheckinClientProps {
  initialBooking?: BookingData;
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

export default function CheckinClient({ initialBooking }: CheckinClientProps) {
  const params = useParams();
  const bookingToken = params.bookingId as string;

  const [loading, setLoading] = useState(!initialBooking);
  const [booking, setBooking] = useState<BookingData | null>(initialBooking || null);
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
    if (!initialBooking) {
      // Fetch booking data if not provided by server
      const fetchBooking = async () => {
        try {
          const response = await fetch(`/api/check-in?token=${bookingToken}`);
          const data = await response.json();

          if (data.success) {
            setBooking(data.data.booking);
          } else {
            setError(data.error || 'Failed to load booking');
          }
        } catch (err) {
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
      setGuests([{
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
      }]);
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
          token: bookingToken,
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

  const nights = Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24));
  const firstName = booking.guestLeaderName.split(' ')[0] || 'Guest';

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
                      {guests.map((guest, index) => (
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
                                  <Label htmlFor={`email-${guest.id}`}>Email Address</Label>
                                  <Input
                                    id={`email-${guest.id}`}
                                    type="email"
                                    value={guest.email}
                                    onChange={(e) => updateGuest(guest.id, 'email', e.target.value)}
                                  />
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
                                      className="flex-1"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor={`dateOfBirth-${guest.id}`}>Date of Birth *</Label>
                                  <Input
                                    id={`dateOfBirth-${guest.id}`}
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
                                      {countries.map(country => (
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
                                      {countries.map(country => (
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
                                      {purposeOfStayOptions.map(option => (
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
                                      {countries.map(country => (
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
                                      {getDocumentTypesForNationality(guest.nationality).map(docType => (
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
                                    required
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`visaNumber-${guest.id}`}>Visa Number (if applicable)</Label>
                                  <Input
                                    id={`visaNumber-${guest.id}`}
                                    value={guest.visaNumber}
                                    onChange={(e) => updateGuest(guest.id, 'visaNumber', e.target.value)}
                                    placeholder="Enter visa number if applicable"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`notes-${guest.id}`}>Additional Notes</Label>
                                  <Input
                                    id={`notes-${guest.id}`}
                                    value={guest.notes}
                                    onChange={(e) => updateGuest(guest.id, 'notes', e.target.value)}
                                    placeholder="Any additional information"
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

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
                          Total tax amount: <strong>{calculateCityTax(guests, nights)} CZK</strong>
                        </p>
                        {showPaymentForm ? (
                          <StripePayment
                            amount={calculateCityTax(guests, nights)}
                            bookingId={booking.id}
                            guestCount={guests.length}
                            onSuccess={handlePaymentSuccess}
                            onError={handlePaymentError}
                          />
                        ) : (
                          <Button onClick={initiatePayment} disabled={calculateCityTax(guests, nights) === 0}>
                            Pay Prague City Tax ({calculateCityTax(guests, nights)} CZK)
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span>City tax payment completed successfully!</span>
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

              {/* Restaurants & Bars */}
              <div ref={restaurantsRef}>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Utensils className="mr-2 h-5 w-5" />
                      Restaurants & Bars 🍻
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-muted p-4 rounded-lg">
                        <h5 className="font-medium text-sm mb-2">U Fleku</h5>
                        <p className="text-xs text-muted-foreground">
                          Historic brewery from 1499. Traditional Czech beer and food in a medieval setting.
                        </p>
                      </div>

                      <div className="bg-muted p-4 rounded-lg">
                        <h5 className="font-medium text-sm mb-2">Lokál</h5>
                        <p className="text-xs text-muted-foreground">
                          Modern Czech pub with excellent beer and traditional dishes. Popular with locals.
                        </p>
                      </div>

                      <div className="bg-muted p-4 rounded-lg">
                        <h5 className="font-medium text-sm mb-2">Café Savoy</h5>
                        <p className="text-xs text-muted-foreground">
                          Elegant café with beautiful interior, perfect for breakfast or afternoon coffee.
                        </p>
                      </div>

                      <div className="bg-muted p-4 rounded-lg">
                        <h5 className="font-medium text-sm mb-2">Hemingway Bar</h5>
                        <p className="text-xs text-muted-foreground">
                          Award-winning cocktail bar with expert mixologists and sophisticated atmosphere.
                        </p>
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