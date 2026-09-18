/* JSON-LD injected from a module so CSP can stay script-src 'self'. */

const data = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Natal Atlas",
      url: "https://astrochart.jonbailey.xyz/",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      softwareVersion: "1.2.8",
      license: "https://github.com/Pitchfork-and-Torch/natal-atlas/blob/main/LICENSE",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: "Cast a natal chart in the browser. Tropical wheel, houses, transits, and synastry. Nothing is uploaded.",
      image: "https://astrochart.jonbailey.xyz/og.jpg?v=1.1.0",
      author: { "@type": "Person", name: "Jon Bailey", url: "https://jonbailey.xyz/" },
      isPartOf: { "@type": "WebSite", name: "Jon Bailey", url: "https://jonbailey.xyz/" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Does birth data leave this device?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Cast, vault, and overlays run in the browser. Nothing is uploaded.",
          },
        },
        {
          "@type": "Question",
          name: "Which zodiac and houses?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Tropical apparent geocentric. Porphyry by default, or whole sign or equal. Solar chart if the birth time is unknown.",
          },
        },
        {
          "@type": "Question",
          name: "What is the chronograph?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "After you cast, chapter 06 winds Hour, Day, Month, Year, or Decade. Exact transit hits appear as jewels. Solar, lunar, Jupiter, and Saturn returns are first-class jumps. Nothing is uploaded.",
          },
        },
        {
          "@type": "Question",
          name: "How do I set the birth place?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Type a city name. Matching cities appear as you type. You can also enter latitude, longitude, and timezone, or use this location.",
          },
        },
        {
          "@type": "Question",
          name: "Can two charts share a wheel?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Save a chart in the Vault and set it as the outer ring, or overlay this minute.",
          },
        },
      ],
    },
  ],
};

const el = document.createElement("script");
el.type = "application/ld+json";
el.textContent = JSON.stringify(data);
document.head.appendChild(el);
