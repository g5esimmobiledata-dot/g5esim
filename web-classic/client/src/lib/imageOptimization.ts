export interface ImageOptimizationOptions {
  src: string;
  alt: string;
  loading?: 'lazy' | 'eager';
  sizes?: string;
  className?: string;
}

export function getOptimizedImageProps(options: ImageOptimizationOptions) {
  const { src, alt, loading = 'lazy', sizes, className } = options;
  
  return {
    src,
    alt,
    loading,
    ...(sizes && { sizes }),
    ...(className && { className }),
    decoding: 'async' as const,
  };
}

export function generateSrcSet(baseUrl: string, widths: number[]): string {
  return widths
    .map(width => `${baseUrl}?w=${width} ${width}w`)
    .join(', ');
}

export function generatePlaceholder(width: number, height: number, color: string = '#e5e7eb'): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'%3E%3Crect width='${width}' height='${height}' fill='${color}'/%3E%3C/svg%3E`;
}

export function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const wordCount = text.trim().split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

export function isImageBelowFold(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.top > window.innerHeight;
}

export const IMAGE_WIDTHS = {
  thumbnail: [150, 300],
  card: [300, 600, 900],
  hero: [640, 1024, 1536, 2048],
} as const;
