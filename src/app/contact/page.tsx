"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  MessageSquare, 
  Send,
  CheckCircle,
  Loader2,
  User,
  Building,
  ArrowLeft
} from 'lucide-react';

interface FormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  inquiryType: 'booking' | 'general' | 'property' | 'support';
}

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    inquiryType: 'general'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const inquiryTypes = [
    { value: 'booking', label: 'Booking Inquiry', icon: Building },
    { value: 'general', label: 'General Question', icon: MessageSquare },
    { value: 'property', label: 'Property Information', icon: MapPin },
    { value: 'support', label: 'Support Request', icon: Phone }
  ];

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <Card className="w-full max-w-md text-center border-gray-200">
          <CardContent className="p-8">
            <CheckCircle className="w-16 h-16 text-black mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-black mb-2">Message Sent!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for contacting us. We'll get back to you within 24 hours.
            </p>
            <Button 
              onClick={() => {
                setIsSubmitted(false);
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  subject: '',
                  message: '',
                  inquiryType: 'general'
                });
              }}
              className="w-full bg-black hover:bg-gray-800 text-white"
            >
              Send Another Message
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="border-black text-black hover:bg-black hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Properties
                </Button>
              </Link>
              <Logo size="md" />
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-3">
                <Link href="/about">
                  <Button variant="ghost" size="sm" className="text-black hover:bg-gray-100">
                    About Us
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto max-w-4xl text-center px-4">
          <h2 className="text-5xl font-bold text-black mb-6">
            Contact Us
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Have a question about our Prague properties or need assistance with your booking? 
            We're here to help and would love to hear from you.
          </p>
        </div>
      </section>

      <Separator className="bg-gray-200" />

      <div className="container mx-auto max-w-6xl px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-black">
                  <User className="w-5 h-5" />
                  Contact Information
                </CardTitle>
                <CardDescription>
                  Reach out to us directly using any of the methods below
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 text-black">Email</h4>
                    <a 
                      href="mailto:hello@nickandjenny.com"
                      className="text-black hover:text-gray-600 transition-colors underline"
                    >
                      hello@nickandjenny.com
                    </a>
                    <p className="text-sm text-gray-500 mt-1">
                      We respond within 24 hours
                    </p>
                  </div>
                </div>

                <Separator className="bg-gray-200" />

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 text-black">Phone</h4>
                    <a 
                      href="tel:+420123456789"
                      className="text-black hover:text-gray-600 transition-colors underline"
                    >
                      +420 123 456 789
                    </a>
                    <p className="text-sm text-gray-500 mt-1">
                      Available 9 AM - 8 PM CET
                    </p>
                  </div>
                </div>

                <Separator className="bg-gray-200" />

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 text-black">Location</h4>
                    <p className="text-gray-700">Prague, Czech Republic</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Serving properties across Prague
                    </p>
                  </div>
                </div>

                <Separator className="bg-gray-200" />

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 text-black">Response Time</h4>
                    <p className="text-gray-700">Within 24 hours</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Urgent matters: Call directly
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-black">
                  <MessageSquare className="w-5 h-5 text-black" />
                  Need Immediate Check-in Help?
                </h4>
                <p className="text-gray-600 mb-4">
                  For check-in assistance or urgent property issues, contact Sue directly:
                </p>
                <Button variant="outline" className="w-full border-black text-black hover:bg-black hover:text-white" asChild>
                  <a href="tel:+420123456789">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Sue for Check-in Support
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-black">Send us a Message</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as possible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Inquiry Type */}
                <div>
                  <Label htmlFor="inquiryType" className="text-black">Inquiry Type</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {inquiryTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => handleInputChange('inquiryType', type.value)}
                          className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                            formData.inquiryType === type.value
                              ? 'border-black bg-gray-50 text-black'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name and Email */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-black">Full Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                      className="mt-1 border-gray-300 focus:border-black focus:ring-black"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-black">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                      className="mt-1 border-gray-300 focus:border-black focus:ring-black"
                    />
                  </div>
                </div>

                {/* Phone and Subject */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-black">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+420 123 456 789"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="mt-1 border-gray-300 focus:border-black focus:ring-black"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject" className="text-black">Subject *</Label>
                    <Input
                      id="subject"
                      type="text"
                      placeholder="Brief subject line"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      required
                      className="mt-1 border-gray-300 focus:border-black focus:ring-black"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <Label htmlFor="message" className="text-black">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Please describe your inquiry in detail..."
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    required
                    className="mt-1 min-h-32 border-gray-300 focus:border-black focus:ring-black"
                  />
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full bg-black hover:bg-gray-800 text-white" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Message...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  * Required fields. We'll never share your information with third parties.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Logo size="md" className="text-white [&>span:first-child]:text-white [&>span:last-child]:text-gray-300" />
              </div>
              <p className="text-gray-400">
                Creating exceptional accommodation experiences with personal attention to detail.
              </p>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Contact</h5>
              <div className="text-gray-400 space-y-2">
                <p>Email: <a href="mailto:hello@nickandjenny.com" className="text-gray-300 hover:text-white transition-colors">hello@nickandjenny.com</a></p>
                <p>Phone: +420 xxx xxx xxx</p>
              </div>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Services</h5>
              <div className="text-gray-400 space-y-2">
                <p>Premium Accommodations</p>
                <p>Concierge Services</p>
                <p>Local Experiences</p>
              </div>
            </div>
          </div>
          <Separator className="my-8 bg-gray-800" />
          <div className="text-center text-gray-400">
            <p>&copy; 2024 Nick & Jenny. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}