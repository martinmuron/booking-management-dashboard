import { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, Heart, Home, Users, Award } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About Us | Nick & Jenny',
  description: 'Learn about Nick & Jenny, two Brits renovating beautiful properties across Czech Republic',
}

export default function AboutPage() {
  const testimonials = [
    {
      name: "Richard",
      location: "Slovakia",
      rating: 5,
      text: "The room was in a good location. Arrival went smoothly to the room, getting there was not a problem. The room is great for sleeping, showering and exploring the city all day. Everything you need for a pleasant stay is there.",
      daysAgo: 2
    },
    {
      name: "Katarzyna", 
      location: "Poland",
      rating: 5,
      text: "Very nice place, easy to get, super close to the subway. Kitchen well equipped, clean and spacious bathroom. Host always responsive and friendly. Great spot for weekend or longer stay in Prague.",
      daysAgo: 2
    },
    {
      name: "Samira",
      location: "Berlin, Germany", 
      rating: 5,
      text: "The place is really practical and perfect for a few nights, we walked into the old town quite often. It's a bit far but definitely easily walkable. The public transport is also close by and you're in the center very quick. We loved staying there.",
      daysAgo: 3
    },
    {
      name: "Collins Nzubechukwu",
      location: "Nigeria",
      rating: 5,
      text: "It is a great place and I had a good experience. The host was very accommodating and the location was perfect for exploring Prague.",
      daysAgo: 3
    },
    {
      name: "Nemanja",
      location: "Osijek, Croatia",
      rating: 5, 
      text: "Short and very nice stay, 4 people - individual beds. Location is very good. Everything was clean and well-organized.",
      daysAgo: 3
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="relative py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              <Heart className="w-4 h-4 mr-2" />
              Meet the Team
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
              About Nick & Jenny
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Two Brits living long-term in Prague, renovating old properties throughout Czech Republic 
              and creating exceptional experiences for our guests.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">9000+</div>
              <div className="text-gray-600">Five-Star Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">50+</div>
              <div className="text-gray-600">Properties</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">5+</div>
              <div className="text-gray-600">Years Experience</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">100%</div>
              <div className="text-gray-600">Identity Verified</div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-16">Our Team</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Nick & Jenny */}
            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">
                  N&J
                </div>
                <h3 className="font-semibold text-lg mb-2">Nick & Jenny</h3>
                <Badge variant="outline" className="mb-3">
                  <MapPin className="w-3 h-3 mr-1" />
                  Prague, Czech Republic
                </Badge>
                <p className="text-gray-600 text-sm">
                  Born in the 80s, we're two Brits living long-term in Prague. We renovate old properties 
                  throughout Czech Republic and are always looking for exciting projects. In our spare time 
                  we enjoy food and travel across Europe and beyond.
                </p>
              </CardContent>
            </Card>

            {/* Sue */}
            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">
                  S
                </div>
                <h3 className="font-semibold text-lg mb-2">Sue</h3>
                <Badge variant="outline" className="mb-3">
                  <Users className="w-3 h-3 mr-1" />
                  Property Manager
                </Badge>
                <p className="text-gray-600 text-sm">
                  I am living long term in Prague with my dog Alik. I help manage the properties with 
                  Jenny and Nick. I also help them raise my grandchild in my spare time! I will be 
                  mainly contacting you to organise your check-in.
                </p>
              </CardContent>
            </Card>

            {/* Dominika */}
            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">
                  D
                </div>
                <h3 className="font-semibold text-lg mb-2">Dominika</h3>
                <Badge variant="outline" className="mb-3">
                  <Home className="w-3 h-3 mr-1" />
                  Check-in Specialist
                </Badge>
                <p className="text-gray-600 text-sm">
                  I work with Nick in the office and also help with checking guests in. I am Slovak 
                  and living in Prague. I ensure every guest has a smooth arrival experience.
                </p>
              </CardContent>
            </Card>

            {/* Identity Verified Badge */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-dashed border-blue-200">
              <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                <Award className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-blue-800">Identity Verified</h3>
                <Badge variant="secondary" className="mb-3">
                  Business Host
                </Badge>
                <p className="text-blue-600 text-sm">
                  Our identity has been verified and we're registered as a business. 
                  Book with confidence knowing you're staying with trusted hosts.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">What Our Guests Say</h2>
            <div className="flex items-center justify-center gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="text-xl font-semibold ml-2">5.0 out of 5</span>
            </div>
            <p className="text-gray-600">Based on over 9,000 verified reviews</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4 line-clamp-4">"{testimonial.text}"</p>
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-gray-500">{testimonial.location}</div>
                    </div>
                    <div className="text-gray-400">
                      {testimonial.daysAgo} days ago
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}