import { motion } from "framer-motion";

interface PhoneMockupProps {
  children: React.ReactNode;
  className?: string;
}

export function PhoneMockup({ children, className = "" }: PhoneMockupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateY: -5 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
      className={`relative ${className}`}
      style={{ perspective: "1000px" }}
    >
      <div 
        className="relative mx-auto phone-shadow rounded-[3rem] bg-gray-900 dark:bg-gray-800 p-2 sm:p-3"
        style={{ 
          width: "min(320px, 85vw)",
          transform: "rotateY(-2deg) rotateX(2deg)",
        }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 sm:h-7 w-28 sm:w-32 bg-gray-900 dark:bg-gray-800 rounded-b-2xl z-10" />
        
        <div className="absolute top-2 left-1/2 -translate-x-1/2 h-1.5 w-16 bg-gray-700 rounded-full z-20" />
        
        <div className="relative bg-background rounded-[2.5rem] overflow-hidden" style={{ aspectRatio: "9/19" }}>
          <div className="h-full w-full overflow-hidden">
            {children}
          </div>
        </div>
        
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 h-1 w-24 sm:w-28 bg-gray-700 rounded-full" />
      </div>
    </motion.div>
  );
}

export function PhoneScreenContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full w-full bg-background flex flex-col">
      {children}
    </div>
  );
}
