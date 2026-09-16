import { useSettingByKey } from '@/hooks/useSettings';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

interface OfferSchema {
  '@type': 'Offer';
  price: string;
  priceCurrency: string;
  name?: string;
  description?: string;
}

interface SoftwareApplicationSchema {
  '@context': 'https://schema.org';
  '@type': 'SoftwareApplication';
  name: string;
  applicationCategory: string;
  operatingSystem?: string;
  description?: string;
  url?: string;
  offers?: OfferSchema | OfferSchema[];
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: string;
    ratingCount: string;
  };
  author?: {
    '@type': 'Organization';
    name: string;
    url?: string;
  };
  screenshot?: string;
  featureList?: string[];
}

interface OrganizationSchema {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
  contactPoint?: {
    telephone?: string;
    contactType?: string;
    email?: string;
  };
  sameAs?: string[];
}

interface FaqItem {
  question: string;
  answer: string;
}

interface ProductSchema {
  name?: string;
  description?: string;
  image?: string;
  brand?: string;
  sku?: string;
  price?: string;
  priceCurrency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder' | 'Discontinued';
  url?: string;
  ratingValue?: string;
  ratingCount?: string;
}

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  keywords?: string[];
  structuredData?: Partial<SoftwareApplicationSchema>;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
  ogType?: string;
  ogSiteName?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  additionalMetaTags?: Array<{
    name?: string;
    property?: string;
    content: string;
  }>;
  googleVerification?: string;
  bingVerification?: string;
  facebookAppId?: string;
  structuredDataOrg?: OrganizationSchema | null;
  structuredDataFaq?: FaqItem[] | null;
  structuredDataProduct?: ProductSchema | null;
}

const DEFAULT_TWITTER_CARD = 'summary_large_image';

function getDefaultStructuredData(siteName: string, description: string): SoftwareApplicationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: siteName,
    applicationCategory: 'TravelApplication',
    operatingSystem: 'Web',
    description: description,
    author: {
      '@type': 'Organization',
      name: siteName,
    },
  };
}

function createOrUpdateMetaTag(
  attributeType: 'name' | 'property',
  attributeValue: string,
  content: string,
): void {
  if (!content) return;
  let element = document.querySelector(`meta[${attributeType}="${attributeValue}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeType, attributeValue);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function createOrUpdateLinkTag(rel: string, href: string): void {
  if (!href) return;
  let element = document.querySelector(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

function removeMetaTag(attributeType: 'name' | 'property', attributeValue: string): void {
  const element = document.querySelector(`meta[${attributeType}="${attributeValue}"]`);
  if (element) {
    element.remove();
  }
}

function removeLinkTag(rel: string): void {
  const element = document.querySelector(`link[rel="${rel}"]`);
  if (element) {
    element.remove();
  }
}

function getOrCreateJsonLdScript(): HTMLScriptElement {
  let script = document.querySelector(
    'script[type="application/ld+json"][data-seo-head]',
  ) as HTMLScriptElement | null;

  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-head', 'true');
    document.head.appendChild(script);
  }

  return script;
}

function removeJsonLdScript(): void {
  const script = document.querySelector('script[type="application/ld+json"][data-seo-head]');
  if (script) {
    script.remove();
  }
}

function getOrCreateJsonLdScriptById(id: string): HTMLScriptElement {
  let script = document.querySelector(
    `script[type="application/ld+json"][data-seo-id="${id}"]`,
  ) as HTMLScriptElement | null;

  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-id', id);
    document.head.appendChild(script);
  }

  return script;
}

function removeJsonLdScriptById(id: string): void {
  const script = document.querySelector(`script[type="application/ld+json"][data-seo-id="${id}"]`);
  if (script) {
    script.remove();
  }
}

export function SEOHead({
  title,
  description,
  canonicalUrl,
  ogImage,
  keywords = [],
  structuredData,
  twitterCard = DEFAULT_TWITTER_CARD,
  twitterSite,
  twitterCreator,
  ogType = 'website',
  ogSiteName,
  noIndex = false,
  noFollow = false,
  additionalMetaTags = [],
  googleVerification,
  bingVerification,
  facebookAppId,
  structuredDataOrg,
  structuredDataFaq,
  structuredDataProduct,
}: SEOHeadProps): null {
  // Global Settings from Store
  const globalTitle = useSettingByKey('seo_default_title');
  const globalTitleSuffix = useSettingByKey('seo_title_suffix');
  const globalDescription = useSettingByKey('seo_default_description');
  const globalKeywords = useSettingByKey('seo_default_keywords');
  const globalOgImage = useSettingByKey('seo_og_image');
  const globalTwitterHandle = useSettingByKey('seo_twitter_handle');
  const globalGoogleVerify = useSettingByKey('seo_google_verification');
  const globalBingVerify = useSettingByKey('seo_bing_verification');
  const globalFavicon = useSettingByKey('favicon');
  const { data: storefront } = useQuery<{
    storefrontConfig?: {
      faviconUrl?: string | null;
    } | null;
  } | null>({
    queryKey: ['/api/reseller/storefront/current'],
  });
  const updatedAt = useSettingByKey('updated_at');
  const siteName = useSettingByKey('platform_name') || 'eSIM Connect';

  const effectiveSiteName = ogSiteName || siteName;
  const effectiveDescription = description || globalDescription || '';
  const effectiveKeywords = [...keywords, ...(globalKeywords ? globalKeywords.split(',').map(k => k.trim()) : [])];
  const effectiveOgImage = ogImage || globalOgImage || '/og-image.png';

  useEffect(() => {
    const previousTitle = document.title;

    // Title Logic: Page Title + Suffix
    let finalTitle = title || globalTitle || siteName;
    if (globalTitleSuffix && !finalTitle.includes(globalTitleSuffix)) {
      finalTitle = `${finalTitle} ${globalTitleSuffix}`;
    } else if (!finalTitle.includes(effectiveSiteName) && !globalTitleSuffix) {
      finalTitle = `${finalTitle} | ${effectiveSiteName}`;
    }

    document.title = finalTitle;

    // Favicon handling
    const activeFavicon = storefront?.storefrontConfig?.faviconUrl || globalFavicon;
    if (activeFavicon) {
      const baseFaviconUrl = activeFavicon.startsWith('http')
        ? activeFavicon
        : `${window.location.origin}${activeFavicon}`;

      const v = updatedAt || Date.now();
      const faviconUrl = `${baseFaviconUrl}?v=${v}`;

      createOrUpdateLinkTag('icon', faviconUrl);
      createOrUpdateLinkTag('shortcut icon', faviconUrl);
      createOrUpdateLinkTag('apple-touch-icon', faviconUrl);
    }

    // Meta Tags
    createOrUpdateMetaTag('name', 'description', effectiveDescription);

    if (effectiveKeywords.length > 0) {
      createOrUpdateMetaTag('name', 'keywords', Array.from(new Set(effectiveKeywords)).join(', '));
    }

    const robotsContent = [noIndex ? 'noindex' : 'index', noFollow ? 'nofollow' : 'follow'].join(', ');
    createOrUpdateMetaTag('name', 'robots', robotsContent);

    // Verification
    const gVerify = googleVerification || globalGoogleVerify;
    if (gVerify) createOrUpdateMetaTag('name', 'google-site-verification', gVerify);

    const bVerify = bingVerification || globalBingVerify;
    if (bVerify) createOrUpdateMetaTag('name', 'msvalidate.01', bVerify);

    if (facebookAppId) createOrUpdateMetaTag('property', 'fb:app_id', facebookAppId);

    // Open Graph
    createOrUpdateMetaTag('property', 'og:title', finalTitle);
    createOrUpdateMetaTag('property', 'og:description', effectiveDescription);
    createOrUpdateMetaTag('property', 'og:type', ogType);
    createOrUpdateMetaTag('property', 'og:site_name', effectiveSiteName);

    if (effectiveOgImage) {
      const absoluteOgImage = effectiveOgImage.startsWith('http')
        ? effectiveOgImage
        : `${window.location.origin}${effectiveOgImage}`;
      createOrUpdateMetaTag('property', 'og:image', absoluteOgImage);
      createOrUpdateMetaTag('property', 'og:image:alt', finalTitle);
      createOrUpdateMetaTag('property', 'og:image:width', '1200');
      createOrUpdateMetaTag('property', 'og:image:height', '630');
    }

    createOrUpdateMetaTag('property', 'og:locale', 'en_US');

    if (canonicalUrl) {
      createOrUpdateMetaTag('property', 'og:url', canonicalUrl);
      createOrUpdateLinkTag('canonical', canonicalUrl);
    } else {
      createOrUpdateLinkTag('canonical', window.location.href);
    }

    // Twitter
    createOrUpdateMetaTag('name', 'twitter:card', twitterCard);
    createOrUpdateMetaTag('name', 'twitter:title', finalTitle);
    createOrUpdateMetaTag('name', 'twitter:description', effectiveDescription);

    const tSite = twitterSite || globalTwitterHandle;
    if (tSite) createOrUpdateMetaTag('name', 'twitter:site', tSite);

    const tCreator = twitterCreator || globalTwitterHandle;
    if (tCreator) createOrUpdateMetaTag('name', 'twitter:creator', tCreator);

    if (effectiveOgImage) {
      const absoluteOgImage = effectiveOgImage.startsWith('http')
        ? effectiveOgImage
        : `${window.location.origin}${effectiveOgImage}`;
      createOrUpdateMetaTag('name', 'twitter:image', absoluteOgImage);
      createOrUpdateMetaTag('name', 'twitter:image:alt', finalTitle);
    }

    additionalMetaTags.forEach((tag) => {
      if (tag.name) {
        createOrUpdateMetaTag('name', tag.name, tag.content);
      } else if (tag.property) {
        createOrUpdateMetaTag('property', tag.property, tag.content);
      }
    });

    // JSON-LD
    const defaultData = getDefaultStructuredData(effectiveSiteName, effectiveDescription);
    const mergedStructuredData: SoftwareApplicationSchema = {
      ...defaultData,
      ...structuredData,
      url: canonicalUrl || structuredData?.url || window.location.origin,
      description: structuredData?.description || effectiveDescription,
    };

    const jsonLdScript = getOrCreateJsonLdScript();
    jsonLdScript.textContent = JSON.stringify(mergedStructuredData, null, 2);

    // Organization Schema
    if (structuredDataOrg && Object.keys(structuredDataOrg).length > 0) {
      const orgSchema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: structuredDataOrg.name || effectiveSiteName,
        url: structuredDataOrg.url || window.location.origin,
        ...(structuredDataOrg.logo && { logo: structuredDataOrg.logo }),
        ...(structuredDataOrg.description && { description: structuredDataOrg.description }),
        ...(structuredDataOrg.contactPoint && {
          contactPoint: { '@type': 'ContactPoint', ...structuredDataOrg.contactPoint },
        }),
        ...(structuredDataOrg.sameAs && structuredDataOrg.sameAs.length > 0 && {
          sameAs: structuredDataOrg.sameAs,
        }),
      };
      const orgScript = getOrCreateJsonLdScriptById('org');
      orgScript.textContent = JSON.stringify(orgSchema, null, 2);
    }

    // Clean up
    return () => {
      document.title = previousTitle;
      removeMetaTag('name', 'description');
      removeMetaTag('name', 'keywords');
      removeMetaTag('name', 'robots');
      removeMetaTag('name', 'google-site-verification');
      removeMetaTag('name', 'msvalidate.01');
      removeMetaTag('property', 'fb:app_id');
      removeMetaTag('property', 'og:title');
      removeMetaTag('property', 'og:description');
      removeMetaTag('property', 'og:type');
      removeMetaTag('property', 'og:site_name');
      removeMetaTag('property', 'og:image');
      removeMetaTag('property', 'og:image:alt');
      removeMetaTag('property', 'og:image:width');
      removeMetaTag('property', 'og:image:height');
      removeMetaTag('property', 'og:image:type');
      removeMetaTag('property', 'og:locale');
      removeMetaTag('property', 'og:url');
      removeMetaTag('name', 'twitter:card');
      removeMetaTag('name', 'twitter:title');
      removeMetaTag('name', 'twitter:description');
      removeMetaTag('name', 'twitter:image');
      removeMetaTag('name', 'twitter:image:alt');
      removeMetaTag('name', 'twitter:site');
      removeMetaTag('name', 'twitter:creator');
      removeLinkTag('canonical');
      removeJsonLdScript();
      removeJsonLdScriptById('org');
      removeJsonLdScriptById('faq');
      removeJsonLdScriptById('product');
    };
  }, [
    title, globalTitle, globalTitleSuffix, description, globalDescription,
    canonicalUrl, ogImage, globalOgImage, keywords, globalKeywords, siteName,
    structuredData, twitterCard, twitterSite, twitterCreator, globalTwitterHandle,
    ogType, effectiveSiteName, noIndex, noFollow, additionalMetaTags,
    googleVerification, globalGoogleVerify, bingVerification, globalBingVerify,
    facebookAppId, structuredDataOrg, structuredDataFaq, structuredDataProduct,
    globalFavicon, storefront?.storefrontConfig?.faviconUrl, updatedAt,
  ]);

  return null;
}

export type { SEOHeadProps, SoftwareApplicationSchema, OfferSchema };
