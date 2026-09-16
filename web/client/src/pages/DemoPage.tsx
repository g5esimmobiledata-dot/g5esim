import DemoPreviewModal from '@/components/DemoPreviewModal';
import { useSettingByKey } from '@/hooks/useSettings';

export default function DemoPage() {
  const logo = useSettingByKey('logo');

  return (
    <DemoPreviewModal
      screenshot="/images/bg-img.png" // update screenshot name if needed
      blurIntensity="sm"
      overlayOpacity={90}
      logo={logo || ''}
      /* ✅ NEW PROJECT CONTENT */
      title="eSimConnect – Global eSIM & Travel Data Platform"
      tagline="Stay connected worldwide with instant eSIM activation in 200+ destinations"
      themeColor="bg-primary"
      docsLink="/contact"
      infoNote={
        <>
          <span className="font-semibold">
            Explore the platform as a traveler or admin to test plans, purchases, and dashboard
            features.
          </span>
          <br />
          <span className="mt-1 block text-xs text-gray-500">
            Demo Accounts have limited Access for security reasons.
          </span>
        </>
      }
      /* 🌍 Web Demo */
      demoUrl="https://esimconnect.diploy.in/admin/login"
      demoAdmin={{
        email: 'demo@diploy.in',
        password: 'Demo@123',
      }}
      /* 📱 Mobile App Demo */
      applicationdemoUrl="http://demo.diploy.in/eSimConnect/eSimConnect.apk"
      applicationdemoAdmin={{
        email: 'user@gmail.com',
        password: 'Diploy@123',
      }}
      /* CTA Button */
      buttonLabel="🚀 Visit eSimConnect"
      buttonLink="https://esimconnect.diploy.in/admin/login"
      bottomHelp=""
      supportEmail="support@diploy.in"
    />
  );
}
