/* Original natal copy. Composed from placement parts. Not a commercial guidebook. */

export const PLANET = {
  sun: {
    name: "Sun",
    core: "the will, the heat of being seen",
    verb: "shines",
  },
  moon: {
    name: "Moon",
    core: "the private weather and how you nourish yourself",
    verb: "keeps",
  },
  mercury: {
    name: "Mercury",
    core: "the mind's voice and the reflex of speech",
    verb: "speaks",
  },
  venus: {
    name: "Venus",
    core: "taste, attraction, the way you make a room warmer",
    verb: "draws",
  },
  mars: {
    name: "Mars",
    core: "drive, heat, the first move",
    verb: "pushes",
  },
  jupiter: {
    name: "Jupiter",
    core: "appetite for more, faith, the campaign",
    verb: "expands",
  },
  saturn: {
    name: "Saturn",
    core: "spine, time, the structures that last",
    verb: "builds",
  },
  uranus: {
    name: "Uranus",
    core: "the itch to invent a new rule",
    verb: "breaks",
  },
  neptune: {
    name: "Neptune",
    core: "dream, fog, the myth under the workday",
    verb: "dissolves",
  },
  pluto: {
    name: "Pluto",
    core: "the basement current, what will not stay buried",
    verb: "transforms",
  },
  northNode: {
    name: "North Node",
    core: "the life lesson you are walking toward",
    verb: "pulls",
  },
  chiron: {
    name: "Chiron",
    core: "the wound that teaches",
    verb: "mends",
  },
  asc: {
    name: "Ascendant",
    core: "the mask, the entrance, the first temperature of the room",
    verb: "arrives",
  },
  mc: {
    name: "Midheaven",
    core: "the public roof, vocation, how the world files you",
    verb: "aims",
  },
};

export const SIGN = {
  Aries: { core: "first-mover fire", gift: "start without a committee", trap: "burning the map before the road exists" },
  Taurus: { core: "slow earth and appetite", gift: "making a thing that stays", trap: "refusing to move after the ground has" },
  Gemini: { core: "twin air, quick mind", gift: "connecting what others leave unlinked", trap: "talking the work away" },
  Cancer: { core: "tidal water, the house inside", gift: "protecting what is tender", trap: "armor that becomes a moat" },
  Leo: { core: "fixed fire, the need to be witnessed", gift: "radiance that is actually yours", trap: "performing a self that wins instead of the one that is true" },
  Virgo: { core: "craft earth, the useful cut", gift: "making the vague exact", trap: "sanding the soul down to a list" },
  Libra: { core: "the air of the other", gift: "finding the elegant balance", trap: "losing the vote of the self" },
  Scorpio: { core: "deep water, no small talk", gift: "going where the polite will not", trap: "gripping what should be composted" },
  Sagittarius: { core: "mutable fire, a bigger sky", gift: "meaning with a horizon", trap: "the sermon without the walk" },
  Capricorn: { core: "cardinal earth, the mountain", gift: "time as an ally", trap: "feelings that need a job title first" },
  Aquarius: { core: "fixed air, the future tense", gift: "permission to be strange", trap: "the crowd of one that will not come in" },
  Pisces: { core: "mutable water, the dissolve", gift: "empathy without a border", trap: "fog mistaken for a plan" },
};

export const HOUSE = {
  1: "the body and the entrance",
  2: "worth, voice, what you keep",
  3: "the near world, siblings of thought",
  4: "the basement of origin, home",
  5: "play, making, the risk of joy",
  6: "craft, duty, the daily engine",
  7: "the other, the contract, the mirror",
  8: "shared heat, debt, the underworld of two",
  9: "belief, distance, the long road",
  10: "the roof of the life, vocation, reputation",
  11: "allies, the future crowd, the cause",
  12: "the backstage, sleep, what works unseen",
};

export const ASPECT = {
  conjunction: { name: "conjunction", feel: "fused", gift: "one current, two names", trap: "no space between the notes" },
  sextile: { name: "sextile", feel: "cooperative", gift: "help that still asks for a hand", trap: "talent left unpicked" },
  square: { name: "square", feel: "tense", gift: "friction that makes a spine", trap: "the same fight on a new street" },
  trine: { name: "trine", feel: "easy", gift: "a closed circuit of talent", trap: "skipping the unglamorous middle" },
  opposition: { name: "opposition", feel: "polar", gift: "a fulcrum between two truths", trap: "the seesaw that never sits" },
  quincunx: { name: "quincunx", feel: "askew", gift: "adjustment as a skill", trap: "never quite lining up" },
};

const ORDINALS = {
  1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th",
  7: "7th", 8: "8th", 9: "9th", 10: "10th", 11: "11th", 12: "12th",
};

export function ordinal(n) {
  return ORDINALS[n] || String(n);
}

export function bodyHeadline(id, sign, house) {
  const p = PLANET[id];
  const s = SIGN[sign];
  if (!p || !s) return `${id} in ${sign}`;
  if (id === "asc") return `The mask that ${s.gift.charAt(0).toLowerCase()}${s.gift.slice(1)}`;
  if (id === "mc") return `A public life that would rather ${s.gift.charAt(0).toLowerCase()}${s.gift.slice(1)}`;
  if (id === "sun") return `${s.core.charAt(0).toUpperCase()}${s.core.slice(1)} at the center`;
  if (id === "moon") return `Feelings that prefer ${s.gift.charAt(0).toLowerCase()}${s.gift.slice(1)}`;
  return `${p.name} in ${sign}, ${ordinal(house)} house`;
}

export function bodyReading(id, sign, house, { timeUnknown = false, retro = false } = {}) {
  const p = PLANET[id];
  const s = SIGN[sign];
  const h = HOUSE[house];
  if (!p || !s) return "";
  const houseLine = timeUnknown
    ? "Birth time unknown, so houses are a solar sketch, not a clocked roof."
    : `This lands in the ${ordinal(house)} house: ${h}.`;
  const retroLine = retro
    ? " Retrograde: the motion turns inward. Review, revise, do not force the first draft."
    : "";
  if (id === "asc") {
    return `The ascendant is ${sign}. First impression is ${s.core}. Gift: ${s.gift}. Watch: ${s.trap}.`;
  }
  if (id === "mc") {
    return `The midheaven is ${sign}. Vocation wants ${s.core}. Gift: ${s.gift}. Watch: ${s.trap}.`;
  }
  return `${p.name} in ${sign} ${p.verb} through ${s.core}. ${p.core.charAt(0).toUpperCase()}${p.core.slice(1)}. Gift: ${s.gift}. Watch: ${s.trap}. ${houseLine}${retroLine}`;
}

export function aspectNote(aName, bName, type) {
  const t = ASPECT[type];
  if (!t) return `${aName} contacts ${bName}.`;
  return `${aName} ${t.name} ${bName}: ${t.feel}. Gift: ${t.gift}. Watch: ${t.trap}.`;
}

export function stelliumCopy(sign, names) {
  const s = SIGN[sign] || { core: sign, gift: "focus", trap: "no counterweight" };
  return {
    headline: `${names.length} lights stacked in ${sign}`,
    body: `${names.join(", ")} concentrate in ${sign}. The chart does not dabble in ${s.core}. It is the main weather. Gift: ${s.gift}. The counterweight is the opposite sign: permission to not live in only this room.`,
  };
}

export function tsquareCopy(apexName, others) {
  return {
    headline: `A T-square aimed at ${apexName}`,
    body: `${others.join(" and ")} pull against ${apexName}. Tension is the engine. The gift is refusal of the cheap exit. The homework is letting a new fact change the plan.`,
  };
}

export function grandTrineCopy(element, names) {
  return {
    headline: `A ${element} grand trine`,
    body: `${names.join(", ")} close a circuit in ${element}. Talent is easy. The leak is skipping the unglamorous middle of a project.`,
  };
}

export function kiteCopy(focusName) {
  return {
    headline: "A kite, with a sail",
    body: `A grand trine grows an opposition through ${focusName}. The easy circuit is pushed into action. The opposition is the wind.`,
  };
}

export function yodCopy(apexName) {
  return {
    headline: `A yod pointing at ${apexName}`,
    body: `Two quincunxes and a sextile form a finger of adjustment. ${apexName} is asked to translate two unlike languages. The gift is a strange skill. The trap is never feeling lined up.`,
  };
}

export function themeSunrise(sunSign) {
  return {
    id: "sunrise",
    title: "A sunrise chart",
    body: `The sun in ${sunSign} sits with the rising. The day and the person start together. Life keeps returning to visibility and the question of who you are when the lights are on.`,
  };
}

export function themeNight(sunSign) {
  return {
    id: "night",
    title: "A night chart",
    body: `The sun in ${sunSign} is below the horizon of this chart. The heat is real, but it works from inside the house. Public glare is not the native climate.`,
  };
}

export function themeTwoLights(sunSign, moonSign) {
  const a = SIGN[sunSign];
  const b = SIGN[moonSign];
  if (sunSign === moonSign) {
    return {
      id: "two-lights",
      title: `Sun and moon in ${sunSign}`,
      body: `The two lights share a room. Will and weather agree on ${a.core}. The gift is coherence. The trap is no inner opposition to argue with.`,
    };
  }
  return {
    id: "two-lights",
    title: `${sunSign} outside, ${moonSign} inside`,
    body: `The world meets ${a.core}. The private weather is ${b.core}. Both are true. Neither should be asked to become the other.`,
  };
}

export function themeVocation(mcSign) {
  const s = SIGN[mcSign];
  return {
    id: "vocation",
    title: `The ${mcSign} skyline`,
    body: `The midheaven in ${mcSign} wants a public life that ${s.gift.charAt(0).toLowerCase()}${s.gift.slice(1)}. The atlas is not a horoscope for fitting in. It is a map for how the roof of the life wants to be built.`,
  };
}

export function themeUnknownTime() {
  return {
    id: "unknown-time",
    title: "Time unknown",
    body: "No birth clock, so the houses are a solar sketch: the sun stands in for the ascendant. Signs, aspects, and the two lights still hold. The roof and the door of the chart are approximate.",
  };
}

export function chronographLede(dateLabel) {
  return `A movement against the natal face. Wind the ring. Outer ticks are the sky on ${dateLabel}. Nothing is uploaded.`;
}

export function hitNote(transitName, natalName, type, phase) {
  const p = phase === "exact" ? "exact" : phase === "separating" ? "separating" : "applying";
  return `Transiting ${transitName} ${type} natal ${natalName}, ${p}.`;
}
