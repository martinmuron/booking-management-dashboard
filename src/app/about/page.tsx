import { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Star, MapPin, Users } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { SiteHeader } from '@/components/SiteHeader'

export const metadata: Metadata = {
  title: 'About Nick, Jenny & Team | Nick & Jenny',
  description: 'Meet Nick, Jenny, and the dedicated team keeping every Prague property immaculate for guests.',
}

export default function AboutPage() {
  const testimonials = [
    {
      name: "Richard",
      location: "Slovakia",
      text: "The room was in a good location. Arrival went smoothly to the room, getting there was not a problem. The room is great for sleeping, showering and exploring the city all day. Everything you need for a pleasant stay is there.",
      daysAgo: 2
    },
    {
      name: "Katarzyna", 
      location: "Poland",
      text: "Very nice place, easy to get, super close to the subway. Kitchen well equipped, clean and spacious bathroom. Host always responsive and friendly. Great spot for weekend or longer stay in Prague.",
      daysAgo: 2
    },
    {
      name: "Samira",
      location: "Berlin, Germany", 
      text: "The place is really practical and perfect for a few nights, we walked into the old town quite often. It's a bit far but definitely easily walkable. The public transport is also close by and you're in the center very quick. We loved staying there.",
      daysAgo: 3
    },
    {
      name: "Collins Nzubechukwu",
      location: "Nigeria",
      text: "It is a great place and I had a good experience. The host was very accommodating and the location was perfect for exploring Prague.",
      daysAgo: 3
    },
    {
      name: "Nemanja",
      location: "Osijek, Croatia",
      text: "Short and very nice stay, 4 people - individual beds. Location is very good. Everything was clean and well-organized.",
      daysAgo: 3
    },
    {
      name: "Maria Santos",
      location: "Barcelona, Spain",
      text: "Excellent location and very clean apartment. Nick and Jenny were super helpful with recommendations. Will definitely stay again!",
      daysAgo: 4
    },
    {
      name: "Thomas Mueller",
      location: "Munich, Germany",
      text: "Perfect stay in Prague. The apartment had everything we needed and the hosts were incredibly responsive to any questions.",
      daysAgo: 5
    },
    {
      name: "Elena Rossi",
      location: "Milan, Italy",
      text: "Beautiful property with amazing attention to detail. The location was perfect for exploring the old town. Highly recommend!",
      daysAgo: 6
    },
    {
      name: "James Wilson",
      location: "Manchester, UK",
      text: "As fellow Brits, Nick and Jenny made us feel right at home. The property exceeded our expectations in every way.",
      daysAgo: 7
    },
    {
      name: "Anna Kowalski",
      location: "Warsaw, Poland",
      text: "Spotless apartment with great amenities. Check-in process was seamless and the hosts provided excellent local tips.",
      daysAgo: 8
    },
    {
      name: "Pierre Dubois",
      location: "Lyon, France",
      text: "Fantastic location and beautifully maintained property. The hosts go above and beyond to ensure a comfortable stay.",
      daysAgo: 9
    },
    {
      name: "Lisa Anderson",
      location: "Stockholm, Sweden",
      text: "Perfect weekend getaway spot. Clean, comfortable, and in a great location. Nick and Jenny are wonderful hosts.",
      daysAgo: 10
    },
    {
      name: "Marco Valentini",
      location: "Rome, Italy",
      text: "Exceptional service and beautiful accommodation. The property was exactly as described and the hosts were very helpful.",
      daysAgo: 11
    },
    {
      name: "Sophie Laurent",
      location: "Paris, France",
      text: "Loved staying here! The apartment was impeccable and the location couldn't be better for exploring Prague.",
      daysAgo: 12
    },
    {
      name: "David Brown",
      location: "Edinburgh, Scotland",
      text: "Outstanding property with fantastic hosts. Everything was perfect from check-in to check-out. Highly recommended!",
      daysAgo: 13
    },
    {
      name: "Carmen Rodriguez",
      location: "Madrid, Spain",
      text: "Beautiful space with excellent attention to detail. The hosts were incredibly welcoming and helpful throughout our stay.",
      daysAgo: 14
    },
    {
      name: "Michael O'Connor",
      location: "Dublin, Ireland",
      text: "Perfect Prague accommodation. Clean, comfortable, and well-located. Nick and Jenny are excellent hosts who go the extra mile.",
      daysAgo: 15
    },
    {
      name: "Julia Schmidt",
      location: "Vienna, Austria",
      text: "Exceptional stay with wonderful hosts. The property was immaculate and the location was ideal for sightseeing.",
      daysAgo: 16
    },
    {
      name: "Roberto Silva",
      location: "Lisbon, Portugal",
      text: "Fantastic property in a great location. The hosts provided excellent service and made our stay truly memorable.",
      daysAgo: 17
    },
    {
      name: "Emma Thompson",
      location: "London, UK",
      text: "Brilliant accommodation with fantastic hosts. Everything was spotless and the location was perfect for exploring.",
      daysAgo: 18
    },
    {
      name: "Henrik Larsson",
      location: "Copenhagen, Denmark",
      text: "Outstanding property with exceptional service. Nick and Jenny are wonderful hosts who ensure every detail is perfect.",
      daysAgo: 19
    },
    {
      name: "Isabella Ferrari",
      location: "Florence, Italy",
      text: "Beautiful apartment with amazing hosts. Clean, comfortable, and perfectly located. Would definitely stay again!",
      daysAgo: 20
    },
    {
      name: "Alexander Petrov",
      location: "Budapest, Hungary",
      text: "Excellent accommodation with fantastic hosts. The property exceeded expectations and the service was impeccable.",
      daysAgo: 21
    },
    {
      name: "Sarah Mitchell",
      location: "Amsterdam, Netherlands",
      text: "Perfect Prague getaway! The property was beautiful and the hosts were incredibly helpful with local recommendations.",
      daysAgo: 22
    },
    {
      name: "Carlos Mendez",
      location: "Barcelona, Spain",
      text: "Outstanding stay with wonderful hosts. The property was exactly as advertised and the location was unbeatable.",
      daysAgo: 23
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader activeRoute="about" />

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold text-black mb-6">
            Nick, Jenny & Team
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Two Brits living long-term in Prague supported by a talented crew who renovate, maintain, 
            and care for every detail so your stay in this beautiful city feels effortless from arrival to departure.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-black mb-2">9000+</div>
              <div className="text-gray-600">Five-Star Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-black mb-2">50+</div>
              <div className="text-gray-600">Properties</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-black mb-2">5+</div>
              <div className="text-gray-600">Years Experience</div>
            </div>
          </div>
        </div>
      </section>

      <Separator className="bg-gray-200" />

      {/* Team Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-black mb-4">Our Team</h3>
            <p className="text-gray-600 max-w-xl mx-auto">
              Meet the specialists who keep every stay organized, spotless, and running smoothly
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Nick & Jenny */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-gray-200">
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">
                  N&J
                </div>
                <h3 className="font-semibold text-lg mb-2 text-black">Nick & Jenny</h3>
                <div className="flex items-center justify-center gap-1 text-gray-500 text-sm mb-3">
                  <MapPin className="w-3 h-3" />
                  Prague, Czech Republic
                </div>
                <p className="text-gray-600 text-sm">
                  Born in the 80s, we&apos;re two Brits living long-term in Prague. We renovate old properties 
                  throughout Prague and are always looking for exciting projects. In our spare time 
                  we enjoy food and travel across Europe and beyond.
                </p>
              </CardContent>
            </Card>

            {/* Guest Experience Team */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-gray-200">
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">
                  GE
                </div>
                <h3 className="font-semibold text-lg mb-2 text-black">Guest Experience Team</h3>
                <div className="flex items-center justify-center gap-1 text-gray-500 text-sm mb-3">
                  <Users className="w-3 h-3" />
                  Concierge & Support
                </div>
                <p className="text-gray-600 text-sm">
                  A multilingual crew handles every question, coordinates arrivals, and keeps communication 
                  flowing so guests feel supported before, during, and after their stay.
                </p>
              </CardContent>
            </Card>

            {/* Operations Team */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-gray-200">
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">
                  OT
                </div>
                <h3 className="font-semibold text-lg mb-2 text-black">Operations Team</h3>
                <div className="flex items-center justify-center gap-1 text-gray-500 text-sm mb-3">
                  <Users className="w-3 h-3" />
                  Housekeeping & Maintenance
                </div>
                <p className="text-gray-600 text-sm">
                  Specialists in housekeeping, repairs, and staging keep every property spotless, organized, 
                  and working perfectly for each new arrival.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Separator className="bg-gray-200" />

      {/* Testimonials Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-black mb-4">What Our Guests Say</h3>
            <div className="flex items-center justify-center gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="text-xl font-semibold ml-2 text-black">5.0 out of 5</span>
            </div>
            <p className="text-gray-600">Based on over 9,000 verified reviews</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300 border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4 text-sm line-clamp-4">&ldquo;{testimonial.text}&rdquo;</p>
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <div className="font-semibold text-black">{testimonial.name}</div>
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
  )
}
