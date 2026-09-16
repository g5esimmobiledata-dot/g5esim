import { Helmet } from "react-helmet-async";

interface OrganizationSchemaProps {
  name: string;
  url: string;
  logo?: string;
  description?: string;
}

export function OrganizationSchema({ name, url, logo, description }: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    ...(logo && { logo }),
    ...(description && { description }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

interface ProductSchemaProps {
  name: string;
  description: string;
  image?: string;
  price: string;
  currency: string;
  availability?: 'InStock' | 'OutOfStock';
  validityDays?: number;
  dataAmount?: string;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
}

export function ProductSchema({
  name,
  description,
  image,
  price,
  currency,
  availability = 'InStock',
  validityDays,
  dataAmount,
  aggregateRating,
}: ProductSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    ...(image && { image }),
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
    },
    ...(validityDays && {
      additionalProperty: [
        {
          "@type": "PropertyValue",
          name: "Validity",
          value: `${validityDays} days`,
        },
        ...(dataAmount ? [{
          "@type": "PropertyValue",
          name: "Data Amount",
          value: dataAmount,
        }] : []),
      ],
    }),
    ...(aggregateRating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: aggregateRating.ratingValue,
        reviewCount: aggregateRating.reviewCount,
      },
    }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

interface BreadcrumbItem {
  name: string;
  item: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

interface ArticleSchemaProps {
  title: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  publisherName?: string;
  publisherLogo?: string;
}

export function ArticleSchema({
  title,
  description,
  image,
  datePublished,
  dateModified,
  authorName,
  publisherName = "eSIM Marketplace",
  publisherLogo,
}: ArticleSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    ...(image && { image }),
    datePublished,
    ...(dateModified && { dateModified }),
    author: {
      "@type": "Person",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: publisherName,
      ...(publisherLogo && {
        logo: {
          "@type": "ImageObject",
          url: publisherLogo,
        },
      }),
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchemaProps {
  items: FAQItem[];
}

export function FAQSchema({ items }: FAQSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(item => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}
