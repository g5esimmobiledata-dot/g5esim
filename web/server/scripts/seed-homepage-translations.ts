/**
 * Homepage Translation Seeding Script
 * Adds all homepage section translation keys and values
 *
 * Run with: npx tsx server/scripts/seed-homepage-translations.ts
 */

import { db } from '../db';
import { languages, translationKeys, translationValues } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// All homepage translation keys with English as base
const homepageKeys: Record<string, string> = {
  // TopFeaturesStrip
  'home.features.unlimited.title': 'Unlimited data plans',
  'home.features.unlimited.description': 'Stay connected with fast data worldwide.',
  'home.features.noRoaming.title': 'No roaming charges',
  'home.features.noRoaming.description': 'Travel freely without extra charges.',
  'home.features.keepSim.title': 'Keep physical SIM',
  'home.features.keepSim.description': 'Keep your local SIM for calls and texts.',
  'home.features.quickSetup.title': 'Quick eSIM setup',
  'home.features.quickSetup.description': 'Activate online and connect in minutes.',

  // FAQWithSupport
  'home.faq.title': 'Frequently Asked Questions about Travel eSIMs',
  'home.faq.support.label': 'Support',
  'home.faq.support.title': 'Need more help?',
  'home.faq.support.description':
    "Can't find what you're looking for? Our support team is available  by email or chat to guide you through setup and troubleshooting.",
  'home.faq.support.button': 'Visit Help Center',
  'home.faq.q1.question': 'What is an eSIM and how does it work?',
  'home.faq.q1.answer':
    'An eSIM is a built-in digital SIM that lets you activate a mobile data plan without a physical card. Just choose a plan, scan a QR code, and connect instantly when you travel.',
  'home.faq.q2.question': 'How do I set up my eSIM on my phone?',
  'home.faq.q2.answer':
    "After purchase, you'll receive an email with a QR code. Open your phone's settings, scan the code, and follow the quick setup guide to start using data.",
  'home.faq.q3.question': 'Can I use my physical SIM and eSIM together?',
  'home.faq.q3.answer':
    'Yes. You can keep your regular SIM for calls and SMS while using your eSIM for data during international travel.',
  'home.faq.q4.question': 'Where does eSIMConnect work?',
  'home.faq.q4.answer':
    'Our data plans cover over 200 destinations across Europe, Asia, the Americas, and more — giving you high-speed internet without roaming fees.',
  'home.faq.q5.question': 'Can I top up or reuse my plan?',
  'home.faq.q5.answer':
    'Yes. Some plans let you add more data or extend your validity directly from your account dashboard, so you can stay connected without buying a new QR code.',

  // TravelerTestimonials
  'home.testimonials.title': 'What travelers say about eSIMConnect',
  'home.testimonials.viewAll': 'View all destinations',
  'home.testimonials.t1':
    'I used eSIMConnect during my trip to Japan and it worked perfectly from the moment I landed. Setup took less than two minutes and the data speed was amazing!',
  'home.testimonials.t2':
    'Super easy to install and no roaming fees. I stayed connected through my entire Europe trip without switching SIM cards. Totally worth it!',
  'home.testimonials.t3':
    'I bought my plan online before traveling to Thailand. The QR code arrived instantly, and the connection was fast everywhere I went — beaches, cities, even remote areas.',
  'home.testimonials.t4':
    'I was surprised how smooth everything was. eSIMConnect saved me from buying local SIMs and hunting for Wi-Fi. Great coverage and fair pricing.',
  'home.testimonials.t5':
    "I've tried other eSIMs before, but eSIMConnect was by far the easiest to activate. Customer support helped me within minutes when I had a question.",
  'home.testimonials.t6':
    "I used it across France, Belgium, and Italy with one single plan. The signal was strong, and I didn't have to worry about extra charges.",

  // HowItWorksSteps
  'home.howItWorks.title': 'How Does eSIMConnect Work',
  'home.howItWorks.cta': 'Get started now',
  'home.howItWorks.step1.label': 'Step 1',
  'home.howItWorks.step1.title': 'Choose A Data Plan For Your Trip',
  'home.howItWorks.step1.description': 'Find The Best eSIM Plan Tailored To Your Destination.',
  'home.howItWorks.step2.label': 'Step 2',
  'home.howItWorks.step2.title': 'Scan The QR Code To Activate',
  'home.howItWorks.step2.description': 'Instantly Install And Set Up Your eSIM In Seconds.',
  'home.howItWorks.step3.label': 'Step 3',
  'home.howItWorks.step3.title': 'Enjoy Fast 4G/5G Data Abroad',
  'home.howItWorks.step3.description': 'Stay Connected Anywhere With Reliable High-Speed Internet.',
  'home.howItWorks.mockup.days': '30days',
  'home.howItWorks.mockup.enableEsim': 'Enable eSIM',
  'home.howItWorks.mockup.country': 'United States',
  'home.howItWorks.mockup.active': 'Active',
  'home.howItWorks.mockup.remainingData': 'Remaining data',
  'home.howItWorks.mockup.expiresIn': 'Expires in',
  'home.howItWorks.mockup.expiryTime': '29 Days, 7 Hours',

  // BenefitsSection
  'home.benefits.title': 'What are the benefits of eSIM',
  'home.benefits.cta': 'View All Destinations',
  'home.benefits.convenience.title': 'Convenience',
  'home.benefits.convenience.description':
    'Activate a new plan anytime without visiting a store or waiting for a physical SIM card.',
  'home.benefits.security.title': 'Security',
  'home.benefits.security.description':
    'eSIMs stay locked to your device, so if your phone is lost or stolen, your data remains protected.',
  'home.benefits.flexibility.title': 'Flexibility',
  'home.benefits.flexibility.description':
    'Keep multiple data plans on one device and switch networks easily while traveling abroad.',
  'home.benefits.noRoaming.title': 'No roaming fees',
  'home.benefits.noRoaming.description':
    'Use local data at affordable rates wherever you go, with no unexpected charges.',
  'home.benefits.sustainability.title': 'Sustainability',
  'home.benefits.sustainability.description':
    'Reduce plastic waste and avoid damage from traditional SIM cards or slots.',

  // DestinationsTabs
  'home.destinations.title': 'Where are you traveling next?',
  'home.destinations.seeAll': 'See all 200+ destinations',
  'home.destinations.tabs.countries': 'Countries',
  'home.destinations.tabs.regional': 'Regional eSIMs',
  'home.destinations.tabs.global': 'Global eSIMs',
  'home.destinations.from': 'From',
  'home.destinations.countries': 'countries',
  'home.destinations.global': 'Global',
  'home.destinations.daysValidity': 'days validity',
  'home.destinations.globalComingSoon': 'Global eSIM Packages coming soon!',
  'home.destinations.browseAll': 'Browse all destinations',

  // PopularEsims
  'home.popular.badge': 'Most {count} Popular eSIMs',
  'home.popular.title': 'Popular eSIMs',
  'home.popular.subtitle':
    'Choose from {packages} total Packages across {destinations}+ destinations',
  'home.popular.viewAll': 'View All Packages',
  'home.popular.mostPopular': 'Most Popular',
  'home.popular.global': 'Global',
  'home.popular.days': 'Days',
  'home.popular.na': 'N/A',
  'home.popular.perDay': 'per day',
  'home.popular.data': 'Data',
  'home.popular.validFor': 'Valid for {days} days',
  'home.popular.viewDetails': 'View Plan Details',
  'home.popular.getPlan': 'Get Plan',
  'home.popular.noPackages': 'No popular Packages available at the moment.',
  'home.popular.browseAll': 'Browse all destinations',
  'home.popular.unlimited': 'UNLIMITED',
};

// Translations for each language
const languageTranslations: Record<string, Record<string, string>> = {
  ar: {
    'home.features.unlimited.title': 'باقات بيانات غير محدودة',
    'home.features.unlimited.description': 'ابق متصلاً ببيانات سريعة حول العالم.',
    'home.features.noRoaming.title': 'بدون رسوم تجوال',
    'home.features.noRoaming.description': 'سافر بحرية بدون رسوم إضافية.',
    'home.features.keepSim.title': 'احتفظ بشريحتك الفعلية',
    'home.features.keepSim.description': 'احتفظ بشريحتك المحلية للمكالمات والرسائل.',
    'home.features.quickSetup.title': 'إعداد سريع للشريحة الإلكترونية',
    'home.features.quickSetup.description': 'فعّل عبر الإنترنت واتصل في دقائق.',
    'home.faq.title': 'الأسئلة الشائعة حول شرائح eSIM للسفر',
    'home.faq.support.label': 'الدعم',
    'home.faq.support.title': 'تحتاج مزيداً من المساعدة؟',
    'home.faq.support.description':
      'لا تجد ما تبحث عنه؟ فريق الدعم لدينا متاح على مدار الساعة عبر البريد الإلكتروني أو الدردشة.',
    'home.faq.support.button': 'زيارة مركز المساعدة',
    'home.faq.q1.question': 'ما هي شريحة eSIM وكيف تعمل؟',
    'home.faq.q1.answer':
      'شريحة eSIM هي شريحة رقمية مدمجة تتيح لك تفعيل خطة بيانات بدون بطاقة فعلية. اختر خطة، امسح رمز QR، واتصل فوراً عند السفر.',
    'home.faq.q2.question': 'كيف أقوم بإعداد شريحة eSIM على هاتفي؟',
    'home.faq.q2.answer':
      'بعد الشراء، ستتلقى بريداً إلكترونياً برمز QR. افتح إعدادات هاتفك، امسح الرمز، واتبع دليل الإعداد السريع.',
    'home.faq.q3.question': 'هل يمكنني استخدام شريحتي الفعلية وeSIM معاً؟',
    'home.faq.q3.answer':
      'نعم. يمكنك الاحتفاظ بشريحتك العادية للمكالمات والرسائل القصيرة واستخدام eSIM للبيانات أثناء السفر.',
    'home.faq.q4.question': 'أين تعمل eSIMConnect؟',
    'home.faq.q4.answer': 'تغطي خططنا أكثر من 200 وجهة في أوروبا وآسيا والأمريكتين والمزيد.',
    'home.faq.q5.question': 'هل يمكنني إعادة شحن أو إعادة استخدام خطتي؟',
    'home.faq.q5.answer':
      'نعم. تسمح بعض الخطط بإضافة المزيد من البيانات أو تمديد الصلاحية من لوحة حسابك.',
    'home.testimonials.title': 'ماذا يقول المسافرون عن eSIMConnect',
    'home.testimonials.viewAll': 'عرض جميع الوجهات',
    'home.howItWorks.title': 'كيف تعمل eSIMConnect',
    'home.howItWorks.cta': 'ابدأ الآن',
    'home.howItWorks.step1.label': 'الخطوة 1',
    'home.howItWorks.step1.title': 'اختر خطة بيانات لرحلتك',
    'home.howItWorks.step1.description': 'اعثر على أفضل خطة eSIM لوجهتك.',
    'home.howItWorks.step2.label': 'الخطوة 2',
    'home.howItWorks.step2.title': 'امسح رمز QR للتفعيل',
    'home.howItWorks.step2.description': 'ثبّت وأعد شريحة eSIM في ثوانٍ.',
    'home.howItWorks.step3.label': 'الخطوة 3',
    'home.howItWorks.step3.title': 'استمتع ببيانات 4G/5G سريعة',
    'home.howItWorks.step3.description': 'ابق متصلاً بإنترنت موثوق عالي السرعة.',
    'home.howItWorks.mockup.days': '30 يوماً',
    'home.howItWorks.mockup.enableEsim': 'تفعيل eSIM',
    'home.howItWorks.mockup.country': 'الولايات المتحدة',
    'home.howItWorks.mockup.active': 'نشط',
    'home.howItWorks.mockup.remainingData': 'البيانات المتبقية',
    'home.howItWorks.mockup.expiresIn': 'تنتهي في',
    'home.howItWorks.mockup.expiryTime': '29 يوماً، 7 ساعات',
    'home.benefits.title': 'ما هي فوائد eSIM',
    'home.benefits.cta': 'عرض جميع الوجهات',
    'home.benefits.convenience.title': 'الراحة',
    'home.benefits.convenience.description':
      'فعّل خطة جديدة في أي وقت بدون زيارة متجر أو انتظار شريحة فعلية.',
    'home.benefits.security.title': 'الأمان',
    'home.benefits.security.description':
      'تبقى شرائح eSIM مقفلة بجهازك، لذا تظل بياناتك محمية إذا فُقد هاتفك.',
    'home.benefits.flexibility.title': 'المرونة',
    'home.benefits.flexibility.description':
      'احتفظ بخطط بيانات متعددة على جهاز واحد وانتقل بين الشبكات بسهولة.',
    'home.benefits.noRoaming.title': 'بدون رسوم تجوال',
    'home.benefits.noRoaming.description': 'استخدم بيانات محلية بأسعار معقولة أينما ذهبت.',
    'home.benefits.sustainability.title': 'الاستدامة',
    'home.benefits.sustainability.description':
      'قلل النفايات البلاستيكية وتجنب تلف فتحات الشرائح التقليدية.',
    'home.destinations.title': 'إلى أين ستسافر بعد ذلك؟',
    'home.destinations.seeAll': 'عرض أكثر من 200 وجهة',
    'home.destinations.tabs.countries': 'الدول',
    'home.destinations.tabs.regional': 'شرائح إقليمية',
    'home.destinations.tabs.global': 'شرائح عالمية',
    'home.destinations.from': 'من',
    'home.destinations.countries': 'دولة',
    'home.destinations.global': 'عالمي',
    'home.destinations.daysValidity': 'يوم صلاحية',
    'home.destinations.globalComingSoon': 'باقات eSIM العالمية قادمة قريباً!',
    'home.destinations.browseAll': 'تصفح جميع الوجهات',
    'home.popular.badge': 'أكثر {count} شريحة eSIM شعبية',
    'home.popular.title': 'شرائح eSIM الشائعة',
    'home.popular.subtitle': 'اختر من بين {packages} باقة في أكثر من {destinations} وجهة',
    'home.popular.viewAll': 'عرض جميع الباقات',
    'home.popular.mostPopular': 'الأكثر شعبية',
    'home.popular.global': 'عالمي',
    'home.popular.days': 'أيام',
    'home.popular.na': 'غ/م',
    'home.popular.perDay': 'لليوم',
    'home.popular.data': 'بيانات',
    'home.popular.validFor': 'صالح لـ {days} يوم',
    'home.popular.viewDetails': 'عرض تفاصيل الخطة',
    'home.popular.getPlan': 'احصل على الخطة',
    'home.popular.noPackages': 'لا توجد باقات شائعة متاحة حالياً.',
    'home.popular.browseAll': 'تصفح جميع الوجهات',
    'home.popular.unlimited': 'غير محدود',
  },
  de: {
    'home.features.unlimited.title': 'Unbegrenzte Datentarife',
    'home.features.unlimited.description': 'Bleiben Sie weltweit mit schnellen Daten verbunden.',
    'home.features.noRoaming.title': 'Keine Roaming-Gebühren',
    'home.features.noRoaming.description': 'Reisen Sie frei ohne zusätzliche Kosten.',
    'home.features.keepSim.title': 'Physische SIM behalten',
    'home.features.keepSim.description': 'Behalten Sie Ihre lokale SIM für Anrufe und SMS.',
    'home.features.quickSetup.title': 'Schnelle eSIM-Einrichtung',
    'home.features.quickSetup.description':
      'Aktivieren Sie online und verbinden Sie sich in Minuten.',
    'home.faq.title': 'Häufig gestellte Fragen zu Reise-eSIMs',
    'home.faq.support.label': 'Support',
    'home.faq.support.title': 'Brauchen Sie mehr Hilfe?',
    'home.faq.support.description':
      'Finden Sie nicht, was Sie suchen? Unser Support-Team ist rund um die Uhr per E-Mail oder Chat erreichbar.',
    'home.faq.support.button': 'Hilfe-Center besuchen',
    'home.howItWorks.title': 'So funktioniert eSIMConnect',
    'home.howItWorks.cta': 'Jetzt starten',
    'home.howItWorks.step1.label': 'Schritt 1',
    'home.howItWorks.step1.title': 'Wählen Sie einen Datentarif für Ihre Reise',
    'home.howItWorks.step1.description': 'Finden Sie den besten eSIM-Tarif für Ihr Reiseziel.',
    'home.howItWorks.step2.label': 'Schritt 2',
    'home.howItWorks.step2.title': 'Scannen Sie den QR-Code zur Aktivierung',
    'home.howItWorks.step2.description': 'Installieren und richten Sie Ihre eSIM in Sekunden ein.',
    'home.howItWorks.step3.label': 'Schritt 3',
    'home.howItWorks.step3.title': 'Genießen Sie schnelles 4G/5G-Internet',
    'home.howItWorks.step3.description':
      'Bleiben Sie überall mit zuverlässigem Highspeed-Internet verbunden.',
    'home.benefits.title': 'Was sind die Vorteile von eSIM',
    'home.benefits.cta': 'Alle Reiseziele ansehen',
    'home.benefits.convenience.title': 'Bequemlichkeit',
    'home.benefits.convenience.description':
      'Aktivieren Sie jederzeit einen neuen Tarif ohne Ladenbesuch.',
    'home.benefits.security.title': 'Sicherheit',
    'home.benefits.security.description':
      'eSIMs bleiben an Ihr Gerät gebunden, Ihre Daten bleiben geschützt.',
    'home.benefits.flexibility.title': 'Flexibilität',
    'home.benefits.flexibility.description': 'Behalten Sie mehrere Datentarife auf einem Gerät.',
    'home.benefits.noRoaming.title': 'Keine Roaming-Gebühren',
    'home.benefits.noRoaming.description': 'Nutzen Sie lokale Daten zu günstigen Tarifen.',
    'home.benefits.sustainability.title': 'Nachhaltigkeit',
    'home.benefits.sustainability.description':
      'Reduzieren Sie Plastikmüll und vermeiden Sie SIM-Kartenschäden.',
    'home.destinations.title': 'Wohin reisen Sie als nächstes?',
    'home.destinations.seeAll': 'Alle 200+ Reiseziele anzeigen',
    'home.destinations.tabs.countries': 'Länder',
    'home.destinations.tabs.regional': 'Regionale eSIMs',
    'home.destinations.tabs.global': 'Globale eSIMs',
    'home.destinations.from': 'Ab',
    'home.destinations.countries': 'Länder',
    'home.destinations.global': 'Global',
    'home.destinations.daysValidity': 'Tage Gültigkeit',
    'home.destinations.globalComingSoon': 'Globale eSIM-Pakete kommen bald!',
    'home.destinations.browseAll': 'Alle Reiseziele durchsuchen',
    'home.popular.badge': 'Die {count} beliebtesten eSIMs',
    'home.popular.title': 'Beliebte eSIMs',
    'home.popular.subtitle':
      'Wählen Sie aus {packages} Paketen in über {destinations}+ Reisezielen',
    'home.popular.viewAll': 'Alle Pakete ansehen',
    'home.popular.mostPopular': 'Am beliebtesten',
    'home.popular.global': 'Global',
    'home.popular.days': 'Tage',
    'home.popular.na': 'N/V',
    'home.popular.perDay': 'pro Tag',
    'home.popular.data': 'Daten',
    'home.popular.validFor': 'Gültig für {days} Tage',
    'home.popular.viewDetails': 'Tarifdetails ansehen',
    'home.popular.getPlan': 'Tarif wählen',
    'home.popular.noPackages': 'Derzeit keine beliebten Pakete verfügbar.',
    'home.popular.browseAll': 'Alle Reiseziele durchsuchen',
    'home.popular.unlimited': 'UNBEGRENZT',
    'home.testimonials.title': 'Was Reisende über eSIMConnect sagen',
    'home.testimonials.viewAll': 'Alle Reiseziele ansehen',
  },
  es: {
    'home.features.unlimited.title': 'Planes de datos ilimitados',
    'home.features.unlimited.description': 'Mantente conectado con datos rápidos en todo el mundo.',
    'home.features.noRoaming.title': 'Sin cargos de roaming',
    'home.features.noRoaming.description': 'Viaja libremente sin cargos adicionales.',
    'home.features.keepSim.title': 'Conserva tu SIM física',
    'home.features.keepSim.description': 'Mantén tu SIM local para llamadas y mensajes.',
    'home.features.quickSetup.title': 'Configuración rápida de eSIM',
    'home.features.quickSetup.description': 'Activa en línea y conéctate en minutos.',
    'home.faq.title': 'Preguntas frecuentes sobre eSIMs de viaje',
    'home.faq.support.label': 'Soporte',
    'home.faq.support.title': '¿Necesitas más ayuda?',
    'home.faq.support.description':
      '¿No encuentras lo que buscas? Nuestro equipo de soporte está disponible 24/7 por correo o chat.',
    'home.faq.support.button': 'Visitar Centro de Ayuda',
    'home.howItWorks.title': 'Cómo funciona eSIMConnect',
    'home.howItWorks.cta': 'Comenzar ahora',
    'home.howItWorks.step1.label': 'Paso 1',
    'home.howItWorks.step1.title': 'Elige un plan de datos para tu viaje',
    'home.howItWorks.step1.description': 'Encuentra el mejor plan eSIM para tu destino.',
    'home.howItWorks.step2.label': 'Paso 2',
    'home.howItWorks.step2.title': 'Escanea el código QR para activar',
    'home.howItWorks.step2.description': 'Instala y configura tu eSIM en segundos.',
    'home.howItWorks.step3.label': 'Paso 3',
    'home.howItWorks.step3.title': 'Disfruta de datos 4G/5G rápidos',
    'home.howItWorks.step3.description':
      'Mantente conectado con internet confiable de alta velocidad.',
    'home.benefits.title': 'Cuáles son los beneficios del eSIM',
    'home.benefits.cta': 'Ver todos los destinos',
    'home.destinations.title': '¿A dónde viajas después?',
    'home.destinations.seeAll': 'Ver los más de 200 destinos',
    'home.destinations.tabs.countries': 'Países',
    'home.destinations.tabs.regional': 'eSIMs regionales',
    'home.destinations.tabs.global': 'eSIMs globales',
    'home.destinations.from': 'Desde',
    'home.destinations.countries': 'países',
    'home.destinations.global': 'Global',
    'home.destinations.daysValidity': 'días de validez',
    'home.destinations.globalComingSoon': '¡Paquetes eSIM globales próximamente!',
    'home.destinations.browseAll': 'Ver todos los destinos',
    'home.popular.title': 'eSIMs populares',
    'home.popular.subtitle': 'Elige entre {packages} paquetes en más de {destinations}+ destinos',
    'home.popular.viewAll': 'Ver todos los paquetes',
    'home.popular.mostPopular': 'Más popular',
    'home.popular.days': 'Días',
    'home.popular.perDay': 'por día',
    'home.popular.viewDetails': 'Ver detalles del plan',
    'home.popular.getPlan': 'Obtener plan',
    'home.popular.unlimited': 'ILIMITADO',
    'home.testimonials.title': 'Lo que dicen los viajeros sobre eSIMConnect',
    'home.testimonials.viewAll': 'Ver todos los destinos',
  },
  fr: {
    'home.features.unlimited.title': 'Forfaits data illimités',
    'home.features.unlimited.description':
      'Restez connecté avec des données rapides dans le monde entier.',
    'home.features.noRoaming.title': "Sans frais d'itinérance",
    'home.features.noRoaming.description': 'Voyagez librement sans frais supplémentaires.',
    'home.features.keepSim.title': 'Gardez votre SIM physique',
    'home.features.keepSim.description': 'Conservez votre SIM locale pour les appels et SMS.',
    'home.features.quickSetup.title': 'Configuration eSIM rapide',
    'home.features.quickSetup.description':
      'Activez en ligne et connectez-vous en quelques minutes.',
    'home.faq.title': 'Questions fréquentes sur les eSIMs de voyage',
    'home.faq.support.label': 'Support',
    'home.faq.support.title': "Besoin d'aide supplémentaire ?",
    'home.faq.support.description':
      'Vous ne trouvez pas ce que vous cherchez ? Notre équipe support est disponible 24/7 par email ou chat.',
    'home.faq.support.button': "Visiter le Centre d'aide",
    'home.howItWorks.title': 'Comment fonctionne eSIMConnect',
    'home.howItWorks.cta': 'Commencer maintenant',
    'home.howItWorks.step1.label': 'Étape 1',
    'home.howItWorks.step1.title': 'Choisissez un forfait data pour votre voyage',
    'home.howItWorks.step1.description': 'Trouvez le meilleur forfait eSIM pour votre destination.',
    'home.howItWorks.step2.label': 'Étape 2',
    'home.howItWorks.step2.title': 'Scannez le code QR pour activer',
    'home.howItWorks.step2.description': 'Installez et configurez votre eSIM en quelques secondes.',
    'home.howItWorks.step3.label': 'Étape 3',
    'home.howItWorks.step3.title': 'Profitez de données 4G/5G rapides',
    'home.howItWorks.step3.description': 'Restez connecté avec un internet haut débit fiable.',
    'home.benefits.title': "Quels sont les avantages de l'eSIM",
    'home.benefits.cta': 'Voir toutes les destinations',
    'home.destinations.title': 'Où voyagez-vous ensuite ?',
    'home.destinations.seeAll': 'Voir les 200+ destinations',
    'home.destinations.tabs.countries': 'Pays',
    'home.destinations.tabs.regional': 'eSIMs régionales',
    'home.destinations.tabs.global': 'eSIMs mondiales',
    'home.destinations.from': 'À partir de',
    'home.destinations.countries': 'pays',
    'home.destinations.global': 'Mondial',
    'home.destinations.daysValidity': 'jours de validité',
    'home.destinations.globalComingSoon': 'Forfaits eSIM mondiaux bientôt disponibles !',
    'home.destinations.browseAll': 'Parcourir toutes les destinations',
    'home.popular.title': 'eSIMs populaires',
    'home.popular.subtitle':
      'Choisissez parmi {packages} forfaits dans plus de {destinations}+ destinations',
    'home.popular.viewAll': 'Voir tous les forfaits',
    'home.popular.mostPopular': 'Plus populaire',
    'home.popular.days': 'Jours',
    'home.popular.perDay': 'par jour',
    'home.popular.viewDetails': 'Voir les détails du forfait',
    'home.popular.getPlan': 'Obtenir le forfait',
    'home.popular.unlimited': 'ILLIMITÉ',
    'home.testimonials.title': 'Ce que disent les voyageurs sur eSIMConnect',
    'home.testimonials.viewAll': 'Voir toutes les destinations',
  },
  hi: {
    'home.features.unlimited.title': 'असीमित डेटा प्लान',
    'home.features.unlimited.description': 'दुनिया भर में तेज डेटा से जुड़े रहें।',
    'home.features.noRoaming.title': 'कोई रोमिंग शुल्क नहीं',
    'home.features.noRoaming.description': 'बिना अतिरिक्त शुल्क के स्वतंत्र रूप से यात्रा करें।',
    'home.features.keepSim.title': 'अपना फिजिकल सिम रखें',
    'home.features.keepSim.description': 'कॉल और टेक्स्ट के लिए अपना लोकल सिम रखें।',
    'home.features.quickSetup.title': 'त्वरित eSIM सेटअप',
    'home.features.quickSetup.description': 'ऑनलाइन एक्टिवेट करें और मिनटों में कनेक्ट करें।',
    'home.howItWorks.title': 'eSIMConnect कैसे काम करता है',
    'home.howItWorks.cta': 'अभी शुरू करें',
    'home.benefits.title': 'eSIM के क्या फायदे हैं',
    'home.benefits.cta': 'सभी गंतव्य देखें',
    'home.destinations.title': 'आप आगे कहाँ यात्रा कर रहे हैं?',
    'home.destinations.seeAll': 'सभी 200+ गंतव्य देखें',
    'home.destinations.tabs.countries': 'देश',
    'home.destinations.tabs.regional': 'क्षेत्रीय eSIMs',
    'home.destinations.tabs.global': 'वैश्विक eSIMs',
    'home.popular.title': 'लोकप्रिय eSIMs',
    'home.popular.viewAll': 'सभी पैकेज देखें',
    'home.popular.days': 'दिन',
    'home.popular.perDay': 'प्रति दिन',
    'home.popular.unlimited': 'असीमित',
    'home.testimonials.title': 'eSIMConnect के बारे में यात्री क्या कहते हैं',
    'home.testimonials.viewAll': 'सभी गंतव्य देखें',
  },
  it: {
    'home.features.unlimited.title': 'Piani dati illimitati',
    'home.features.unlimited.description': 'Rimani connesso con dati veloci in tutto il mondo.',
    'home.features.noRoaming.title': 'Nessun costo di roaming',
    'home.features.noRoaming.description': 'Viaggia liberamente senza costi aggiuntivi.',
    'home.features.keepSim.title': 'Mantieni la SIM fisica',
    'home.features.keepSim.description': 'Mantieni la tua SIM locale per chiamate e SMS.',
    'home.features.quickSetup.title': 'Configurazione eSIM veloce',
    'home.features.quickSetup.description': 'Attiva online e connettiti in pochi minuti.',
    'home.howItWorks.title': 'Come funziona eSIMConnect',
    'home.howItWorks.cta': 'Inizia ora',
    'home.benefits.title': "Quali sono i vantaggi dell'eSIM",
    'home.benefits.cta': 'Vedi tutte le destinazioni',
    'home.destinations.title': 'Dove viaggi dopo?',
    'home.destinations.seeAll': 'Vedi oltre 200 destinazioni',
    'home.destinations.tabs.countries': 'Paesi',
    'home.destinations.tabs.regional': 'eSIM regionali',
    'home.destinations.tabs.global': 'eSIM globali',
    'home.popular.title': 'eSIM popolari',
    'home.popular.viewAll': 'Vedi tutti i pacchetti',
    'home.popular.days': 'Giorni',
    'home.popular.perDay': 'al giorno',
    'home.popular.unlimited': 'ILLIMITATO',
    'home.testimonials.title': 'Cosa dicono i viaggiatori di eSIMConnect',
    'home.testimonials.viewAll': 'Vedi tutte le destinazioni',
  },
  ja: {
    'home.features.unlimited.title': '無制限データプラン',
    'home.features.unlimited.description': '世界中で高速データで接続を維持。',
    'home.features.noRoaming.title': 'ローミング料金なし',
    'home.features.noRoaming.description': '追加料金なしで自由に旅行。',
    'home.features.keepSim.title': '物理SIMを保持',
    'home.features.keepSim.description': '通話やテキスト用のローカルSIMを保持。',
    'home.features.quickSetup.title': 'クイックeSIMセットアップ',
    'home.features.quickSetup.description': 'オンラインでアクティベートし、数分で接続。',
    'home.howItWorks.title': 'eSIMConnectの仕組み',
    'home.howItWorks.cta': '今すぐ始める',
    'home.benefits.title': 'eSIMのメリット',
    'home.benefits.cta': 'すべての目的地を見る',
    'home.destinations.title': '次の旅行先はどこですか？',
    'home.destinations.seeAll': '200以上の目的地を見る',
    'home.destinations.tabs.countries': '国',
    'home.destinations.tabs.regional': '地域eSIM',
    'home.destinations.tabs.global': 'グローバルeSIM',
    'home.popular.title': '人気のeSIM',
    'home.popular.viewAll': 'すべてのパッケージを見る',
    'home.popular.days': '日',
    'home.popular.perDay': '1日あたり',
    'home.popular.unlimited': '無制限',
    'home.testimonials.title': '旅行者がeSIMConnectについて言うこと',
    'home.testimonials.viewAll': 'すべての目的地を見る',
  },
  pl: {
    'home.features.unlimited.title': 'Nielimitowane plany danych',
    'home.features.unlimited.description':
      'Pozostań w kontakcie z szybkimi danymi na całym świecie.',
    'home.features.noRoaming.title': 'Bez opłat za roaming',
    'home.features.noRoaming.description': 'Podróżuj swobodnie bez dodatkowych opłat.',
    'home.features.keepSim.title': 'Zachowaj fizyczną kartę SIM',
    'home.features.keepSim.description': 'Zachowaj lokalną kartę SIM do połączeń i SMS-ów.',
    'home.features.quickSetup.title': 'Szybka konfiguracja eSIM',
    'home.features.quickSetup.description': 'Aktywuj online i połącz się w kilka minut.',
    'home.howItWorks.title': 'Jak działa eSIMConnect',
    'home.howItWorks.cta': 'Zacznij teraz',
    'home.benefits.title': 'Jakie są korzyści z eSIM',
    'home.benefits.cta': 'Zobacz wszystkie destynacje',
    'home.destinations.title': 'Dokąd podróżujesz następnym razem?',
    'home.destinations.seeAll': 'Zobacz ponad 200 destynacji',
    'home.destinations.tabs.countries': 'Kraje',
    'home.destinations.tabs.regional': 'Regionalne eSIM',
    'home.destinations.tabs.global': 'Globalne eSIM',
    'home.popular.title': 'Popularne eSIM',
    'home.popular.viewAll': 'Zobacz wszystkie pakiety',
    'home.popular.days': 'Dni',
    'home.popular.perDay': 'dziennie',
    'home.popular.unlimited': 'BEZ LIMITU',
    'home.testimonials.title': 'Co mówią podróżnicy o eSIMConnect',
    'home.testimonials.viewAll': 'Zobacz wszystkie destynacje',
  },
  pt: {
    'home.features.unlimited.title': 'Planos de dados ilimitados',
    'home.features.unlimited.description': 'Fique conectado com dados rápidos em todo o mundo.',
    'home.features.noRoaming.title': 'Sem taxas de roaming',
    'home.features.noRoaming.description': 'Viaje livremente sem cobranças extras.',
    'home.features.keepSim.title': 'Mantenha seu SIM físico',
    'home.features.keepSim.description': 'Mantenha seu SIM local para chamadas e mensagens.',
    'home.features.quickSetup.title': 'Configuração rápida do eSIM',
    'home.features.quickSetup.description': 'Ative online e conecte-se em minutos.',
    'home.howItWorks.title': 'Como funciona o eSIMConnect',
    'home.howItWorks.cta': 'Começar agora',
    'home.benefits.title': 'Quais são os benefícios do eSIM',
    'home.benefits.cta': 'Ver todos os destinos',
    'home.destinations.title': 'Para onde você vai viajar?',
    'home.destinations.seeAll': 'Ver mais de 200 destinos',
    'home.destinations.tabs.countries': 'Países',
    'home.destinations.tabs.regional': 'eSIMs regionais',
    'home.destinations.tabs.global': 'eSIMs globais',
    'home.popular.title': 'eSIMs populares',
    'home.popular.viewAll': 'Ver todos os pacotes',
    'home.popular.days': 'Dias',
    'home.popular.perDay': 'por dia',
    'home.popular.unlimited': 'ILIMITADO',
    'home.testimonials.title': 'O que os viajantes dizem sobre o eSIMConnect',
    'home.testimonials.viewAll': 'Ver todos os destinos',
  },
  sv: {
    'home.features.unlimited.title': 'Obegränsade datapaket',
    'home.features.unlimited.description': 'Håll dig uppkopplad med snabb data världen över.',
    'home.features.noRoaming.title': 'Inga roamingavgifter',
    'home.features.noRoaming.description': 'Res fritt utan extra avgifter.',
    'home.features.keepSim.title': 'Behåll ditt fysiska SIM',
    'home.features.keepSim.description': 'Behåll ditt lokala SIM för samtal och SMS.',
    'home.features.quickSetup.title': 'Snabb eSIM-installation',
    'home.features.quickSetup.description': 'Aktivera online och anslut på några minuter.',
    'home.howItWorks.title': 'Så fungerar eSIMConnect',
    'home.howItWorks.cta': 'Kom igång nu',
    'home.benefits.title': 'Vilka är fördelarna med eSIM',
    'home.benefits.cta': 'Se alla destinationer',
    'home.destinations.title': 'Vart reser du härnäst?',
    'home.destinations.seeAll': 'Se alla 200+ destinationer',
    'home.destinations.tabs.countries': 'Länder',
    'home.destinations.tabs.regional': 'Regionala eSIM',
    'home.destinations.tabs.global': 'Globala eSIM',
    'home.popular.title': 'Populära eSIM',
    'home.popular.viewAll': 'Se alla paket',
    'home.popular.days': 'Dagar',
    'home.popular.perDay': 'per dag',
    'home.popular.unlimited': 'OBEGRÄNSAD',
    'home.testimonials.title': 'Vad resenärer säger om eSIMConnect',
    'home.testimonials.viewAll': 'Se alla destinationer',
  },
  zh: {
    'home.features.unlimited.title': '无限流量套餐',
    'home.features.unlimited.description': '在全球范围内保持快速数据连接。',
    'home.features.noRoaming.title': '无漫游费用',
    'home.features.noRoaming.description': '自由旅行，无需额外费用。',
    'home.features.keepSim.title': '保留实体SIM卡',
    'home.features.keepSim.description': '保留本地SIM卡用于通话和短信。',
    'home.features.quickSetup.title': '快速eSIM设置',
    'home.features.quickSetup.description': '在线激活，几分钟内连接。',
    'home.howItWorks.title': 'eSIMConnect如何工作',
    'home.howItWorks.cta': '立即开始',
    'home.benefits.title': 'eSIM有什么好处',
    'home.benefits.cta': '查看所有目的地',
    'home.destinations.title': '您下一个旅行目的地是哪里？',
    'home.destinations.seeAll': '查看200+个目的地',
    'home.destinations.tabs.countries': '国家',
    'home.destinations.tabs.regional': '区域eSIM',
    'home.destinations.tabs.global': '全球eSIM',
    'home.popular.title': '热门eSIM',
    'home.popular.viewAll': '查看所有套餐',
    'home.popular.days': '天',
    'home.popular.perDay': '每天',
    'home.popular.unlimited': '无限',
    'home.testimonials.title': '旅行者对eSIMConnect的评价',
    'home.testimonials.viewAll': '查看所有目的地',
  },
};

async function seedHomepageTranslations() {
  console.log('Starting homepage translation seeding...');

  // Get all languages
  const allLanguages = await db.select().from(languages);
  console.log(`Found ${allLanguages.length} languages`);

  // First, create all translation keys if they don't exist
  let keysCreated = 0;
  let keysSkipped = 0;

  for (const [keyName, englishValue] of Object.entries(homepageKeys)) {
    const namespace = 'website';

    // Check if key exists
    const existing = await db
      .select()
      .from(translationKeys)
      .where(and(eq(translationKeys.namespace, namespace), eq(translationKeys.key, keyName)));

    if (existing.length === 0) {
      await db.insert(translationKeys).values({
        namespace,
        key: keyName,
        description: `Homepage: ${keyName}`,
      });
      keysCreated++;
      console.log(`Created key: ${namespace}.${keyName}`);
    } else {
      keysSkipped++;
    }
  }

  console.log(`\nKeys created: ${keysCreated}, skipped: ${keysSkipped}`);

  // Get all keys again after creation
  const allKeys = await db.select().from(translationKeys);

  // Now add translations for each language
  let translationsInserted = 0;
  let translationsSkipped = 0;

  for (const [langCode, translations] of Object.entries(languageTranslations)) {
    const language = allLanguages.find((l) => l.code === langCode);
    if (!language) {
      console.log(`Language ${langCode} not found, skipping...`);
      continue;
    }

    console.log(`\nProcessing ${language.name} (${langCode})...`);

    for (const [keyName, value] of Object.entries(translations)) {
      const key = allKeys.find((k) => k.namespace === 'website' && k.key === keyName);

      if (!key) {
        console.log(`  Key not found: website.${keyName}`);
        continue;
      }

      // Check if translation exists
      const existing = await db
        .select()
        .from(translationValues)
        .where(
          and(eq(translationValues.keyId, key.id), eq(translationValues.languageId, language.id)),
        );

      if (existing.length === 0) {
        await db.insert(translationValues).values({
          keyId: key.id,
          languageId: language.id,
          value: value,
          isVerified: true,
        });
        translationsInserted++;
      } else {
        translationsSkipped++;
      }
    }
  }

  console.log(`\n=== Homepage Translation Seeding Complete ===`);
  console.log(`Translations inserted: ${translationsInserted}`);
  console.log(`Translations skipped (already exist): ${translationsSkipped}`);
}

seedHomepageTranslations()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error seeding homepage translations:', err);
    process.exit(1);
  });
