/* Auralis — configuration
 * Edit ONLY this file to personalise your deployment.
 * Nothing here is sent anywhere. API keys are never stored in this file —
 * they live only in the visitor's own browser localStorage.
 */
window.AURALIS_CONFIG = {
  // Buy Me a Coffee username. Buttons link to
  // https://www.buymeacoffee.com/carlmeiselman
  BUY_ME_A_COFFEE_USERNAME: "carlmeiselman",

  // Default voice preferences (applied when the browser has matching voices)
  DEFAULT_VOICE_PREFS: {
    rate: 1.0,
    pitch: 1.0,
    // Preferred voice name fragments, in order. First match wins.
    // Free voices only: Kokoro on-device voices in most browsers,
    // Microsoft AI voices in Microsoft Edge. Device/browser voice
    // names (Google US English, Samantha, Alex, Daniel…) sounded
    // robotic and are gone.
    preferredNames: [
      "Kokoro Heart", "Microsoft Aria", "Microsoft Jenny", "Microsoft Guy"
    ]
  },

  // Show the three built-in sample articles on the home screen.
  SHOW_SAMPLES: true,

  // Reader proxy fallbacks for fetching public pages.
  // Order matters: direct fetch first, then Jina Reader, then AllOrigins.
  // These are public, free, no-key services. If one is down, the next is tried.
  FETCH_PROXIES: [
    { name: "Jina Reader", url: (u) => "https://r.jina.ai/" + u },
    { name: "AllOrigins", url: (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u) }
  ],

  APP_NAME: "Auralis",
  APP_TAGLINE: "Read Anything Aloud"
};
