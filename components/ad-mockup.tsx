"use client"

interface AdMockupProps {
  format?: 'feed' | 'story'
  imageUrl?: string
  logoUrl?: string
  brandName?: string
  primaryText?: string
  headline?: string
  description?: string
  gradient?: string
  ctaText?: string
}

export function AdMockup({
  format = 'feed',
  imageUrl,
  logoUrl,
  brandName = 'Your Brand',
  primaryText = 'Discover our services',
  headline = 'Get Started Today',
  description = 'Learn more about what we offer',
  gradient = 'from-blue-600 via-blue-500 to-cyan-500',
  ctaText = 'Learn More',
}: AdMockupProps) {
  
  if (format === 'story') {
    return (
      <div className="aspect-[9/16] rounded-2xl border border-border bg-card overflow-hidden relative shadow-lg">
        {/* Story Background */}
        <div className="absolute inset-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={brandName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
          )}
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Story Header */}
        <div className="relative z-10 p-4">
          <div className="h-1 bg-white/30 rounded-full mb-4">
            <div className="h-full w-1/3 bg-white rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-8 w-8 rounded-full object-cover border-2 border-white bg-white" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 border-2 border-white" />
            )}
            <p className="text-white text-sm font-semibold drop-shadow-lg">{brandName}</p>
            <p className="text-white/90 text-xs drop-shadow-lg">2h</p>
          </div>
        </div>

        {/* Story Content */}
        <div className="absolute bottom-20 left-0 right-0 px-6 z-10 text-center">
          <h3 className="text-white text-2xl font-bold drop-shadow-2xl mb-2">
            {headline}
          </h3>
          <p className="text-white text-sm drop-shadow-lg">
            {description}
          </p>
        </div>

        {/* Story CTA */}
        <div className="absolute bottom-8 left-0 right-0 px-4 z-10">
          <button className="w-full bg-white text-gray-900 rounded-full py-3 px-6 font-semibold shadow-lg">
            {ctaText}
          </button>
        </div>
      </div>
    )
  }

  // Feed Format
  return (
    <div className="w-full rounded-lg border border-border bg-card overflow-hidden shadow-lg">
      {/* Ad Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        {logoUrl ? (
          <img src={logoUrl} alt={brandName} className="h-8 w-8 rounded-full object-cover flex-shrink-0 bg-white" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{brandName}</p>
          <p className="text-[10px] text-muted-foreground">Sponsored</p>
        </div>
      </div>

      {/* Ad Creative */}
      {imageUrl ? (
        <div className="aspect-square relative overflow-hidden">
          <img
            src={imageUrl}
            alt={brandName}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className={`aspect-square bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <div className="text-center text-white p-6">
            <h3 className="text-2xl font-bold mb-2">{headline}</h3>
            <p className="text-sm opacity-90">{description}</p>
          </div>
        </div>
      )}

      {/* Ad Copy Content */}
      <div className="p-3 space-y-2">
        {/* Reaction Icons */}
        <div className="flex items-center gap-3 text-muted-foreground">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </div>

        {/* Primary Text */}
        <p className="text-xs">
          <span className="font-semibold">{brandName}</span>{" "}
          {primaryText}
        </p>

        {/* Headline & Description */}
        <div className="pt-1">
          <p className="text-xs font-semibold mb-0.5">{headline}</p>
          <p className="text-xs text-muted-foreground mb-2">{description}</p>
        </div>

        {/* CTA Button */}
        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-md py-2 text-xs font-semibold transition-colors">
          {ctaText}
        </button>
      </div>
    </div>
  )
}

