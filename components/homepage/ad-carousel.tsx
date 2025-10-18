"use client"

import { AdMockup } from '@/components/ad-mockup'

export function AdCarousel() {
  // Example ads with realistic content
  const exampleAds = [
    {
      format: 'feed' as const,
      imageUrl: '/immigration-services-canada-professional.jpg',
      logoUrl: '/logo-immigration.svg',
      brandName: 'Immigration Law Partners',
      primaryText: 'Your gateway to a new beginning. Experienced immigration law services for families and professionals.',
      headline: 'Start Your Immigration Journey',
      description: 'Expert guidance for Canadian immigration',
      ctaText: 'Book Consultation',
    },
    {
      format: 'story' as const,
      imageUrl: '/generated-1760573419416.png',
      logoUrl: '/logo-visa.svg',
      brandName: 'Global Visa Solutions',
      headline: 'Make Canada Home',
      description: 'Professional immigration services',
      ctaText: 'Get Started',
    },
    {
      format: 'feed' as const,
      gradient: 'from-emerald-600 via-emerald-500 to-teal-500',
      logoUrl: '/logo-yoga.svg',
      brandName: 'Eco-Friendly Yoga Mats',
      primaryText: 'Transform your practice with our sustainable, high-performance yoga mats. Made from natural materials.',
      headline: 'Premium Yoga Mats',
      description: 'Eco-friendly | Non-slip | Free shipping',
      ctaText: 'Shop Now',
    },
    {
      format: 'feed' as const,
      imageUrl: '/generated-1760571482569.png',
      logoUrl: '/logo-tech.svg',
      brandName: 'Tech Solutions Inc',
      primaryText: 'Boost your business productivity with our AI-powered tools. Join 10,000+ satisfied customers.',
      headline: 'Smart Business Tools',
      description: 'Automate tasks and grow faster',
      ctaText: 'Start Free Trial',
    },
    {
      format: 'story' as const,
      gradient: 'from-purple-600 via-pink-500 to-rose-500',
      logoUrl: '/logo-fitness.svg',
      brandName: 'Fitness Pro',
      headline: 'Transform Your Body',
      description: '30-day challenge starts now',
      ctaText: 'Join Now',
    },
    {
      format: 'feed' as const,
      imageUrl: '/generated-1760573575903.png',
      logoUrl: '/logo-realestate.svg',
      brandName: 'Modern Real Estate',
      primaryText: 'Find your dream home in the city. Browse luxury apartments and houses with stunning views.',
      headline: 'Your Dream Home Awaits',
      description: 'Premium properties | Virtual tours available',
      ctaText: 'View Properties',
    },
    {
      format: 'feed' as const,
      gradient: 'from-orange-600 via-amber-500 to-yellow-500',
      logoUrl: '/logo-kitchen.svg',
      brandName: 'Gourmet Kitchen',
      primaryText: 'Discover the secret to restaurant-quality meals at home. Premium cookware that lasts a lifetime.',
      headline: 'Professional Cookware',
      description: 'Chef-approved | Lifetime warranty',
      ctaText: 'Shop Collection',
    },
    {
      format: 'story' as const,
      imageUrl: '/generated-1760573615506.png',
      logoUrl: '/logo-marketing.svg',
      brandName: 'Digital Marketing Pro',
      headline: 'Grow Your Business',
      description: 'Expert marketing solutions',
      ctaText: 'Learn More',
    },
  ]

  // Duplicate ads for seamless infinite loop
  const duplicatedAds = [...exampleAds, ...exampleAds]

  return (
    <section className="w-full py-16 overflow-hidden bg-muted/30">
      <div className="max-w-7xl mx-auto mb-8 px-6">
        <h2 className="text-3xl font-bold text-center mb-3">
          See What&apos;s Possible
        </h2>
        <p className="text-center text-muted-foreground">
          Real ad examples created with AI in minutes
        </p>
      </div>
      
      <div className="relative">
        <div className="flex animate-infinite-scroll hover:pause">
          {duplicatedAds.map((ad, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-80 mx-4"
            >
              <AdMockup {...ad} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

