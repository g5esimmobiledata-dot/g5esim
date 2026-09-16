// components/FeatureSection.tsx
'use client';

import React from 'react';

interface FeatureItem {
  text: string;
  icon?: React.ReactNode;
}

interface FeatureSectionProps {
  title: string;
  features: FeatureItem[];
  buttonText?: string;
  buttonAction?: () => void;
  imageSrc: string;
  imageAlt: string;
  layout?: 'left' | 'right';
  subtitle?: string;
  showButton?: boolean;
}

const FeatureSection: React.FC<FeatureSectionProps> = ({
  title,
  features,
  buttonText,
  buttonAction,
  imageSrc,
  imageAlt,
  layout = 'left',
  subtitle,
  showButton = true,
}) => {
  const ContentSection = () => (
    <div className="bg-card rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl border border-border h-full flex flex-col justify-center px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">
      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary mb-3 sm:mb-4">
        {title}
      </h2>

      {subtitle && (
        <p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-5 leading-relaxed">
          {subtitle}
        </p>
      )}

      <div className="space-y-2.5 sm:space-y-3 mb-5 sm:mb-6">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-2 sm:gap-3">
            <div className="flex-shrink-0 mt-0.5 sm:mt-1">
              {feature.icon || (
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <svg
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-foreground text-sm sm:text-base leading-relaxed">{feature.text}</p>
          </div>
        ))}
      </div>

      {showButton && buttonText && (
        <button
          onClick={buttonAction}
          className="bg-primary-gradient text-white font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-all duration-300 flex items-center gap-2 w-fit shadow-lg hover:shadow-primary/50 text-xs sm:text-sm hover:scale-105"
        >
          {buttonText}
          <svg
            className="w-3.5 h-3.5 sm:w-4 sm:h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );

  const ImageSection = () => (
    <div className="relative w-full h-full min-h-[280px] sm:min-h-[350px] lg:min-h-[400px] flex items-center justify-center p-4 sm:p-6 lg:p-10">
      {/* Background Glow - adapts to theme */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[80%] sm:w-[70%] h-[80%] sm:h-[70%] bg-primary/20 dark:bg-primary/30 rounded-full blur-[80px] sm:blur-[100px] lg:blur-[120px]" />
      </div>

      {/* Image Container */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <img
          src={imageSrc}
          alt={imageAlt}
          className="w-full h-auto max-h-[300px] sm:max-h-[400px] lg:max-h-[500px] object-contain border border-border rounded-xl sm:rounded-2xl bg-card/50 backdrop-blur-sm shadow-lg sm:shadow-2xl"
        />
      </div>
    </div>
  );

  return (
    <section className="dark:bg-background bg-gray-100 text-foreground py-8 sm:py-12 lg:py-20">
      <div className="container mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">
          {layout === 'left' ? (
            <>
              <ContentSection />
              <ImageSection />
            </>
          ) : (
            <>
              {/* Desktop: Image first, Mobile: Content first for better UX */}
              <div className="order-2 lg:order-1">
                <ImageSection />
              </div>
              <div className="order-1 lg:order-2">
                <ContentSection />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
