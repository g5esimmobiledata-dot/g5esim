"use client";

import { Check } from "lucide-react";
import { FeatureSecDataType } from "@/types/types";
import { useScroll, useTransform, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export const Timeline = (data: FeatureSecDataType) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div className="w-full font-sans md:px-10 bg-background" ref={containerRef}>
      {/* ============================================
          SECTION TITLE - Theme Aware
          ============================================ */}
      <div className="max-w-7xl mx-auto pt-16 pb-8">
        <h2 className="text-4xl md:text-5xl font-bold text-center text-foreground mb-4">
          {data.secTitle}
        </h2>
      </div>

      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {data.secData.map((item, index) => (
          <div
            key={index}
            className="flex justify-start pt-10 md:pt-28 md:gap-10"
          >
            {/* ============================================
                LEFT SIDE - Timeline Dot & Title
                ============================================ */}
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs md:w-full">
              {/* Timeline Dot - Light: white with border, Dark: dark with border */}
              <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-background dark:bg-card border-2 border-border flex items-center justify-center shadow-sm">
                <div className="h-4 w-4 rounded-full bg-primary shadow-md" />
              </div>

              {/* Desktop Title - Light: gray, Dark: primary */}
              <h3 className="hidden md:block text-xl md:pl-20 md:text-4xl font-bold text-gray-800 dark:text-primary">
                {item.title}
              </h3>
            </div>

            {/* ============================================
                RIGHT SIDE - Content
                ============================================ */}
            <div className="relative pl-20 pr-4 md:pl-4 w-full">
              {/* Mobile Title - Always foreground color */}
              <h3 className="md:hidden block text-2xl mb-4 text-left font-bold text-foreground">
                {item.title}
              </h3>

              {/* Feature Content */}
              <div className="flex text-start justify-between gap-8">
                {item.rightSec.map((info, idx) => (
                  <div
                    key={idx}
                    className={`flex justify-between mx-auto ${
                      index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                    } gap-8 md:gap-12 flex-col items-center w-full`}
                  >
                    {/* ============================================
                        IMAGE - Theme-aware shadow
                        ============================================ */}
                    <div className="relative rounded-2xl overflow-hidden border border-border shadow-xl hover:shadow-2xl dark:shadow-primary/10 dark:hover:shadow-primary/20 transition-shadow duration-300 flex-shrink-0 group">
                      <img
                        src={info.image.src}
                        alt={info.image.alt}
                        className="h-[250px] md:h-[300px] w-full md:w-[400px] object-cover grayscale-0 dark:grayscale group-hover:grayscale-0 transition-all duration-500"
                      />
                    </div>

                    <div className="flex-1 w-full">
                      {/* Subtitle - Light: gray, Dark: primary */}
                      {item.subtitle && (
                        <p className="text-xl md:text-2xl font-semibold text-gray-700 dark:text-primary pb-4">
                          {item.subtitle}
                        </p>
                      )}

                      {/* Feature Points */}
                      <ul className="space-y-4 mb-8">
                        {info.detils.map((point, p) => (
                          <li
                            key={p}
                            className="flex items-start gap-3 text-base md:text-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {/* Check Icon Circle - Light: subtle, Dark: primary glow */}
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mt-0.5 border border-primary/20">
                              <Check className="w-4 h-4 text-primary" />
                            </div>
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>

                      {/* ============================================
                          CTA BUTTON - Theme Aware
                          ============================================ */}
                      <div className="ml-0 md:ml-9">
                        <a href={info.buttonInfo.herf}>
                          <Button className="bg-gray-800 dark:bg-primary text-white dark:text-primary-foreground hover:bg-gray-900 dark:hover:bg-primary/90 rounded-xl px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl hover:shadow-gray-800/50 dark:hover:shadow-primary/50 transition-all hover:scale-105 active:scale-95">
                            {info.buttonInfo.title}
                            <svg
                              className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* ============================================
            ANIMATED TIMELINE LINE - Theme Aware
            ============================================ */}
        <div
          style={{
            height: height + "px",
          }}
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] bg-gradient-to-b from-transparent via-border to-transparent [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
        >
          {/* Animated Progress Line - Light: gray, Dark: primary */}
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-primary via-primary/60 to-transparent rounded-full shadow-lg shadow-primary/50"
          />
        </div>
      </div>
    </div>
  );
};
