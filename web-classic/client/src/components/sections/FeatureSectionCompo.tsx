// import React from 'react';
// import FeatureSection from '../FeatureSection';
// import { useLocation } from 'wouter';

// const FeatureSectionCompo = () => {
//   const [, setLocation] = useLocation();
//   return (
//     <main>
//       {/* First Section - Content Left, Image Right */}
//       <FeatureSection
//         title="Global eSIM Connectivity Made Simple"
//         subtitle="Set up your eSIM in minutes. Choose your destination, activate instantly, and stay connected worldwide without physical SIM cards:"
//         layout="right"
//         imageSrc="/images/timeline/setup5.png"
//         imageAlt=" Setup Interface"
//         buttonText="GET STARTED"
//         buttonAction={() => setLocation('/destinations')}
//         showButton={true}
//         features={[
//           { text: 'Instant eSIM activation with QR code' },
//           { text: 'High-speed data in 150+ countries' },
//           { text: 'No physical SIM or roaming charges' },
//         ]}
//       />

//       {/* Second Section - Image Left, Content Right */}
//       <FeatureSection
//         title="Fast and safe checkout process"
//         layout="left"
//         imageSrc="/images/timeline/setup3.png"
//         imageAlt="Complete Secure Payment"
//         buttonText="Proceed to Payment"
//         buttonAction={() => setLocation('/destinations')}
//         features={[
//           { text: 'Pay using debit card, credit card, UPI, or wallets' },
//           { text: '100% secure and encrypted transactions' },
//           { text: 'Instant order confirmation after payment' },
//           { text: 'No physical SIM or delivery required' },
//         ]}
//       />

//       {/* Third Section - Another Example */}
//       <FeatureSection
//         title="24/7 Customer Support"
//         layout="right"
//         imageSrc="/images/timeline/setup1.png"
//         imageAlt="Customer Support"
//         buttonText="Contact Us"
//         buttonAction={() => setLocation('/contact')}
//         showButton={true}
//         features={[
//           { text: 'Round-the-clock availability' },
//           { text: 'Multi-language support' },
//           { text: 'Instant response time' },
//         ]}
//       />
//     </main>
//   );
// };

// export default FeatureSectionCompo;






import React from 'react';
import FeatureSection from '../FeatureSection';
import { useLocation } from 'wouter';
import { useTranslation } from '@/contexts/TranslationContext';

const FeatureSectionCompo = () => {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  return (
    <main>
      <FeatureSection
        title={t("website.features.section1.title", "Global eSIM Connectivity Made Simple")}
        subtitle={t("website.features.section1.subtitle", "Set up your eSIM in minutes. Choose your destination, activate instantly, and stay connected worldwide without physical SIM cards.")}
        layout="right"
        imageSrc="/images/timeline/setup5.png"
        imageAlt="Setup Interface"
        buttonText={t("website.features.section1.button", "GET STARTED")}
        buttonAction={() => setLocation('/destinations')}
        showButton={true}
        features={[
          { text: t("website.features.section1.feature1", "Instant eSIM activation with QR code") },
          { text: t("website.features.section1.feature2", "High-speed data in 150+ countries") },
          { text: t("website.features.section1.feature3", "No physical SIM or roaming charges") },
        ]}
      />

      <FeatureSection
        title={t("website.features.section2.title", "Fast and Safe Checkout Process")}
        layout="left"
        imageSrc="/images/timeline/setup3.png"
        imageAlt="Complete Secure Payment"
        buttonText={t("website.features.section2.button", "Proceed to Payment")}
        buttonAction={() => setLocation('/destinations')}
        features={[
          { text: t("website.features.section2.feature1", "Pay using debit card, credit card, UPI, or wallets") },
          { text: t("website.features.section2.feature2", "100% secure and encrypted transactions") },
          { text: t("website.features.section2.feature3", "Instant order confirmation after payment") },
          { text: t("website.features.section2.feature4", "No physical SIM or delivery required") },
        ]}
      />

      <FeatureSection
        title={t("website.features.section3.title", "Customer Support")}
        layout="right"
        imageSrc="/images/timeline/setup1.png"
        imageAlt="Customer Support"
        buttonText={t("website.features.section3.button", "Contact Us")}
        buttonAction={() => setLocation('/contact')}
        showButton={true}
        features={[
          { text: t("website.features.section3.feature1", "Round-the-clock availability") },
          { text: t("website.features.section3.feature2", "Multi-language support") },
          { text: t("website.features.section3.feature3", "Instant response time") },
        ]}
      />
    </main>
  );
};

export default FeatureSectionCompo;
