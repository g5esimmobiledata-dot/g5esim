interface FeatureCardProps {
  icon: string; // Image path or URL
  title: string;
  description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-gray-50 rounded-2xl p-6 md:p-8 shadow-lg transition-shadow">
      {/* Icon - No background, just image */}
      <div className="mb-5">
        <img
          src={icon}
          alt={title}
          className="w-16 h-16 md:w-20 md:h-20 object-contain"
        />
      </div>

      {/* Title */}
      <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
        {title}
      </h3>

      {/* Description */}
      <p className="text-base md:text-lg text-gray-600 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
