import React from "react";

const useStaticData = () => {
  const staticData = {
    HowWorksteps: [
      {
        number: 1,
        title: "Choose a Plan",
        description: "Pick the data plan you need for your trip.",
        image: "/images/hwo-work-step/Group3.png",
      },
      {
        number: 2,
        title: "Scan & Activate",
        description:
          "Receive a QR code, scan it, and your eSIM is instantly installed.",
        image: "/images/hwo-work-step/Group4.png",
      },
      {
        number: 3,
        title: "Start Browsing",
        description:
          "Your plan activates automatically when you land, no SIM swapping needed.",
        image: "/images/hwo-work-step/Frame_3.png",
      },
    ],
    WhyChoosefeatures: [
      {
        icon: "/images/why-choose/w1.png",
        title: "Retain your WhatsApp number",
        description:
          "You will only get mobile data and keep your original phone number.",
      },
      {
        icon: "/images/why-choose/w2.png",
        title: "Flexible Data Plans",
        description:
          "Only traveling for a week? Skip the monthly plan—grab a 7-day pack and get just the data you need!",
      },
      {
        icon: "/images/why-choose/w3.png",
        title: "Purchase Once, Top Up Anytime",
        description:
          "Out of data but need more right away? Top up anytime with extra GB—no need to extend your plan!",
      },
      {
        icon: "/images/why-choose/w4.png",
        title: "Avoid high roaming charges",
        description:
          "Choose an eSIM plan tailored to your needs, connect with local carriers, and take charge of your bills!",
      },
    ],
    BuilderFeatures: {
      secTitle: "How to Buy & Use eSIM",
      secData: [
        {
          title: "Choose Your eSIM Plan",
          subtitle: "Find the perfect plan for your journey",
          rightSec: [
            {
              image: {
                src: "/images/timeline/setup1.png",
                alt: "Choose eSIM plan",
              },
              detils: [
                "Select your destination country or region",
                "Choose from flexible data plans for short or long trips",
                "Clear pricing with no hidden charges",
                "Works with all eSIM-compatible devices",
              ],
              buttonInfo: {
                title: "Explore Plans",
                herf: "#plans",
              },
            },
          ],
        },

        {
          title: "Complete Secure Payment",
          subtitle: "Fast and safe checkout process",
          rightSec: [
            {
              image: {
                src: "/images/timeline/setup2.png",
                alt: "Secure payment for eSIM",
              },
              detils: [
                "Pay using debit card, credit card, UPI, or wallets",
                "100% secure and encrypted transactions",
                "Instant order confirmation after payment",
                "No physical SIM or delivery required",
              ],
              buttonInfo: {
                title: "Proceed to Payment",
                herf: "#payment",
              },
            },
          ],
        },

        {
          title: "Receive Your eSIM Instantly",
          subtitle: "No waiting, no shipping",
          rightSec: [
            {
              image: {
                src: "/images/timeline/setup3.png",
                alt: "Instant eSIM delivery",
              },
              detils: [
                "Receive your eSIM QR code instantly after purchase",
                "Access eSIM details via email and dashboard",
                "Includes manual installation instructions",
                "Ready to install anytime before your trip",
              ],
              buttonInfo: {
                title: "View eSIM Details",
                herf: "#esim-details",
              },
            },
          ],
        },

        {
          title: "Install eSIM on Your Device",
          subtitle: "Setup in just a few minutes",
          rightSec: [
            {
              image: {
                src: "/images/timeline/setup4.png",
                alt: "Install eSIM on device",
              },
              detils: [
                "Scan the QR code using your smartphone",
                "Follow simple on-screen installation steps",
                "Takes less than 2 minutes to complete",
                "Wi-Fi connection required during installation",
              ],
              buttonInfo: {
                title: "Installation Guide",
                herf: "#installation",
              },
            },
          ],
        },

        {
          title: "Activate & Start Using",
          subtitle: "Stay connected wherever you travel",
          rightSec: [
            {
              image: {
                src: "/images/timeline/setup5.png",
                alt: "Activate and use eSIM",
              },
              detils: [
                "Automatic activation on arrival at destination",
                "Enjoy high-speed mobile data instantly",
                "No roaming charges or SIM swapping",
                "Reliable connectivity across multiple networks",
              ],
              buttonInfo: {
                title: "Start Using eSIM",
                herf: "#activate",
              },
            },
          ],
        },
      ],
    },
  };
  return staticData;
};

export default useStaticData;
