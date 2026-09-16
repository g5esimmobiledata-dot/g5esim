import { motion, useReducedMotion } from "framer-motion";
import { Globe, CreditCard, Smartphone, Check, Wifi } from "lucide-react";
import ReactCountryFlag from "react-country-flag";

const flagCountries = [
  { code: "US", name: "USA" },
  { code: "GB", name: "UK" },
  { code: "JP", name: "Japan" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "AE", name: "UAE" },
];

export function DestinationIllustration() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative h-24 w-full flex items-center justify-center">
      <motion.div
        className="relative"
        animate={shouldReduceMotion ? {} : { rotate: 360 }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {flagCountries.map((country, index) => {
          const angle = (index / flagCountries.length) * 360;
          const radius = 48;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;

          return (
            <motion.div
              key={country.code}
              className="absolute"
              style={{
                left: `calc(50% + ${x}px - 14px)`,
                top: `calc(50% + ${y}px - 14px)`,
              }}
              animate={shouldReduceMotion ? {} : { rotate: -360 }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md bg-white dark:bg-slate-800 flex items-center justify-center">
                <ReactCountryFlag
                  countryCode={country.code}
                  svg
                  style={{ width: "1.5em", height: "1.5em" }}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        className="absolute z-10 w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg"
        animate={shouldReduceMotion ? {} : { scale: [1, 1.05, 1] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Globe className="w-7 h-7 text-white" />
      </motion.div>
    </div>
  );
}

export function PaymentIllustration() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative h-24 w-full flex items-center justify-center">
      <div className="relative w-24">
        <motion.div
          className="absolute inset-0 w-20 h-12 rounded-lg bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 shadow-md"
          style={{ transform: "rotate(-8deg)", top: "8px", left: "4px" }}
        />

        <motion.div
          className="relative w-20 h-12 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg overflow-hidden"
          animate={shouldReduceMotion ? {} : { y: [0, -4, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="absolute top-2 left-2 w-5 h-4 rounded-sm bg-amber-200/80" />
          <div className="absolute bottom-2 right-2 flex gap-0.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-white/60" />
            ))}
          </div>
          <CreditCard className="absolute bottom-1 left-1 w-3 h-3 text-white/40" />
        </motion.div>

        <motion.div
          className="absolute -right-3 -top-2 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg"
          initial={{ scale: 0, opacity: 0 }}
          animate={
            shouldReduceMotion
              ? { scale: 1, opacity: 1 }
              : {
                  scale: [0, 1.2, 1],
                  opacity: [0, 1, 1],
                }
          }
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 2,
            ease: "easeOut",
          }}
        >
          <Check className="w-4 h-4 text-white" strokeWidth={3} />
        </motion.div>
      </div>
    </div>
  );
}

export function ActivationIllustration() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative h-24 w-full flex items-center justify-center">
      <div className="relative scale-[0.7] origin-center">
        <div className="w-14 h-24 rounded-xl bg-slate-800 dark:bg-slate-900 p-0.5 shadow-xl">
          <div className="w-full h-full rounded-xl bg-white dark:bg-slate-700 overflow-hidden relative">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />

            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-10 grid grid-cols-3 grid-rows-3 gap-0.5 p-1 bg-slate-100 dark:bg-slate-600 rounded">
              {[...Array(9)].map((_, i) => (
                <motion.div
                  key={i}
                  className="bg-slate-800 dark:bg-slate-200 rounded-sm"
                  animate={
                    shouldReduceMotion
                      ? {}
                      : {
                          opacity: [0.3, 1, 0.3],
                        }
                  }
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>

            <motion.div
              className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-emerald-400"
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      top: ["1rem", "3.5rem", "1rem"],
                    }
              }
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            <motion.div
              className="absolute bottom-3 left-1/2 -translate-x-1/2"
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      opacity: [0, 1, 1, 0],
                    }
              }
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="flex items-center gap-1">
                <Wifi className="w-3 h-3 text-emerald-500" />
                <span className="text-[8px] font-medium text-emerald-600 dark:text-emerald-400">
                  Connected
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg"
          animate={
            shouldReduceMotion
              ? {}
              : {
                  scale: [0.8, 1, 0.8],
                }
          }
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </motion.div>
      </div>
    </div>
  );
}

export function HeroStepsIllustrations() {
  return (
    <div className="relative z-40 grid grid-cols-3 gap-4 mt-6 max-w-lg mx-auto lg:mx-0">
      <DestinationIllustration />
      <PaymentIllustration />
      <ActivationIllustration />
    </div>
  );
}
