'use client';

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface Banner {
    id: string;
    title: string;
    imageUrl: string;
    isActive: boolean;
    packageId?: string | null;
}

export default function BannerSlider() {
    const { data } = useQuery({ queryKey: ["/api/banner"] });
    const banners: Banner[] = (data || []).filter((b: Banner) => b.isActive);
    const baseUrl = window.location.origin;


    const [index, setIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [direction, setDirection] = useState<'left' | 'right'>('right');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [itemsPerSlide, setItemsPerSlide] = useState(3);




    useEffect(() => {
        const update = () => {
            const w = window.innerWidth;
            setItemsPerSlide(w < 640 ? 1 : w < 1024 ? 2 : 3);
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    const totalSlides = Math.ceil(banners.length / itemsPerSlide);
    const currentSlide = Math.floor(index / itemsPerSlide);

    const goTo = (slideIndex: number, dir: 'left' | 'right' = 'right') => {
        if (isAnimating) return;
        setDirection(dir);
        setIsAnimating(true);
        setTimeout(() => {
            setIndex(slideIndex * itemsPerSlide);
            setIsAnimating(false);
        }, 700);
    };

    const next = () => {
        const n = currentSlide + 1 >= totalSlides ? 0 : currentSlide + 1;
        goTo(n, 'right');
    };

    const prev = () => {
        const p = currentSlide - 1 < 0 ? totalSlides - 1 : currentSlide - 1;
        goTo(p, 'left');
    };

    const resetInterval = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (banners.length > itemsPerSlide) {
            intervalRef.current = setInterval(next, 30000);
        }
    };

    useEffect(() => {
        resetInterval();
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [banners.length, currentSlide, itemsPerSlide]);

    const touchStartX = useRef<number | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) {
            if (diff > 0) { next(); resetInterval(); }
            else { prev(); resetInterval(); }
        }
        touchStartX.current = null;
    };

    const visibleBanners = banners.slice(index, index + itemsPerSlide);

    if (!banners.length) return null;

    const isSingle = visibleBanners.length === 1;
    const isDouble = visibleBanners.length === 2;

    const gridCols = isSingle
        ? 'grid-cols-1'
        : isDouble
            ? 'grid-cols-2'
            : 'grid-cols-3';

    const animationClass = isAnimating
        ? direction === 'right'
            ? 'opacity-0 -translate-x-3'
            : 'opacity-0 translate-x-3'
        : 'opacity-100 translate-x-0';

    return (
        <div
            className="w-full max-w-7xl mx-auto px-4 sm:px-5 lg:px-6"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Grid */}
            <div
                className={`
          grid gap-4 sm:gap-5
          transition-all duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
          ${gridCols}
          ${isSingle ? 'justify-items-center' : ''}
          ${animationClass}
        `}
            >
                {visibleBanners.map((banner) => {
                    const inner = (
                        <div className="relative w-full overflow-hidden rounded-2xl shadow-md bg-black group">
                            <img
                                src={`${baseUrl}${banner.imageUrl}`}
                                // src={`https://staging.esimmasters.net/uploads/banner/1769234693881-fcrz9neddaw.jpg`}
                                alt={banner.title}
                                draggable={false}
                                className="w-full aspect-[16/10] sm:aspect-video object-cover rounded-2xl transition-transform duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-105"
                            />
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        </div>
                    );

                    return banner.packageId ? (
                        <Link key={banner.id} href={`/unified-checkout/${banner.packageSlug}`}>
                            <a className={`block ${isSingle ? 'w-full max-w-[480px]' : 'w-full'}`}>
                                {inner}
                            </a>
                        </Link>
                    ) : (
                        <div key={banner.id} className={isSingle ? 'w-full max-w-[480px]' : 'w-full'}>
                            {inner}
                        </div>
                    );
                })}
            </div>

            {/* Controls */}
            {totalSlides > 1 && (
                <div className="flex items-center justify-center gap-3 mt-4">
                    {/* Prev */}
                    <button
                        onClick={() => { prev(); resetInterval(); }}
                        aria-label="Previous"
                        className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-black/15 bg-white shadow-sm transition-all duration-200 hover:scale-110 hover:border-black/30 hover:bg-gray-100 active:scale-95 dark:border-white/10 dark:bg-slate-900 dark:hover:border-white/20 dark:hover:bg-slate-800"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-slate-700 dark:text-slate-200" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>

                    {/* Dots */}
                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: totalSlides }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => { goTo(i, i > currentSlide ? 'right' : 'left'); resetInterval(); }}
                                aria-label={`Slide ${i + 1}`}
                                className={`
                                    h-[7px] rounded-full border-none cursor-pointer transition-all duration-300
                                    ${i === currentSlide
                                        ? 'w-5 bg-gray-800 dark:bg-slate-100'
                                        : 'w-[7px] bg-gray-300 hover:bg-gray-500 hover:scale-125 dark:bg-slate-700 dark:hover:bg-slate-400'
                                    }
                `}
                            />
                        ))}
                    </div>

                    {/* Next */}
                    <button
                        onClick={() => { next(); resetInterval(); }}
                        aria-label="Next"
                        className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-black/15 bg-white shadow-sm transition-all duration-200 hover:scale-110 hover:border-black/30 hover:bg-gray-100 active:scale-95 dark:border-white/10 dark:bg-slate-900 dark:hover:border-white/20 dark:hover:bg-slate-800"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-slate-700 dark:text-slate-200" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
