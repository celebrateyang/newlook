import type { StarterHairstyleSlug } from "./catalog";

export interface SalonGuide {
  overview: string;
  feasibility: string;
  instructions: Array<{ label: string; detail: string }>;
  dailyStylingMinutes: number;
  maintenanceWeeks: number;
}

const guides: Record<StarterHairstyleSlug, SalonGuide> = {
  "soft-layered-cut": {
    overview: "Soft, face-framing layers with balanced movement and no harsh disconnection.",
    feasibility: "Best when there is enough length around the face to create visible graduation without thinning the perimeter.",
    instructions: [
      { label: "Shape", detail: "Keep a soft perimeter and build subtle internal movement rather than a heavily stepped silhouette." },
      { label: "Front", detail: "Start face-framing layers around the cheekbone or jaw, adjusting to the client's natural fall." },
      { label: "Crown", detail: "Use light elevation for movement while preserving density through the crown." },
      { label: "Ends", detail: "Point-cut lightly; avoid aggressive thinning that makes the ends look sparse." },
      { label: "Styling", detail: "Blow-dry with a round brush away from the face and finish with a light flexible cream." },
    ], dailyStylingMinutes: 8, maintenanceWeeks: 8,
  },
  "french-bob": {
    overview: "A polished jaw-length bob with a compact outline and soft natural texture.",
    feasibility: "The exact line depends on neck length, density, shrinkage, and the client's preferred amount of daily styling.",
    instructions: [
      { label: "Length", detail: "Set the perimeter near the jaw and confirm the dry resting length before refining." },
      { label: "Shape", detail: "Keep a clean, slightly weighty outline with minimal graduation." },
      { label: "Front", detail: "Soften the front corners enough to frame the face without losing the bob silhouette." },
      { label: "Texture", detail: "Use restrained point cutting; avoid over-thinning fine or medium-density hair." },
      { label: "Styling", detail: "Blow-dry smooth with slight inward bend, then add a small amount of light cream." },
    ], dailyStylingMinutes: 10, maintenanceWeeks: 6,
  },
  "curtain-bangs": {
    overview: "Long center-parted fringe that opens naturally and blends into the face-framing lengths.",
    feasibility: "Cowlicks, forehead growth direction, and shrinkage should be checked before choosing the shortest point.",
    instructions: [
      { label: "Fringe", detail: "Keep the shortest point around the upper cheekbone and lengthen gradually toward the sides." },
      { label: "Parting", detail: "Cut around the client's natural center or near-center part rather than forcing symmetry." },
      { label: "Blend", detail: "Connect the fringe softly into existing face-framing layers without removing corner weight." },
      { label: "Texture", detail: "Use minimal point cutting and assess the fringe when dry." },
      { label: "Styling", detail: "Direct the fringe forward first, then sweep each side away from the face with a round brush." },
    ], dailyStylingMinutes: 5, maintenanceWeeks: 5,
  },
  "textured-crop": {
    overview: "A clean short crop with controlled texture on top and a softly tapered outline.",
    feasibility: "The top should retain enough length to separate into texture; the taper must respect the natural hairline and head shape.",
    instructions: [
      { label: "Top", detail: "Keep approximately 4–6 cm where available and create broken texture with point cutting." },
      { label: "Fringe", detail: "Keep the fringe short and irregular rather than forming a heavy straight line." },
      { label: "Sides", detail: "Use a soft taper, preserving enough weight to blend naturally into the top." },
      { label: "Crown", detail: "Follow the growth pattern and avoid cutting the crown so short that it stands up." },
      { label: "Styling", detail: "Work a small amount of matte paste through dry hair and separate the top with fingertips." },
    ], dailyStylingMinutes: 4, maintenanceWeeks: 4,
  },
  "side-part-taper": {
    overview: "A classic side part with balanced top volume and clean, softly tapered sides.",
    feasibility: "The part should follow the natural growth direction; strong cowlicks may require extra length or daily blow-drying.",
    instructions: [
      { label: "Top", detail: "Retain 6–9 cm through the top, with enough length at the front to sweep across." },
      { label: "Part", detail: "Establish the part along the natural separation instead of cutting a hard artificial line." },
      { label: "Sides", detail: "Create a low, soft taper and blend without exposing excessive scalp." },
      { label: "Crown", detail: "Keep sufficient crown length to lie with the growth pattern." },
      { label: "Styling", detail: "Blow-dry from the part with controlled lift and finish with a light-to-medium hold cream." },
    ], dailyStylingMinutes: 7, maintenanceWeeks: 4,
  },
  "short-quiff": {
    overview: "A short quiff with controlled height at the front and crown, supported by neat tapered sides.",
    feasibility: "Works best when the front has enough length and density to hold lift without appearing separated.",
    instructions: [
      { label: "Front", detail: "Keep 6–8 cm at the front, graduating slightly shorter toward the crown." },
      { label: "Texture", detail: "Add controlled separation without removing the density needed to support the quiff." },
      { label: "Sides", detail: "Use a soft taper and preserve a smooth transition into the top." },
      { label: "Crown", detail: "Respect the natural crown pattern and avoid creating a short disconnected patch." },
      { label: "Styling", detail: "Blow-dry upward and slightly back, then finish with matte clay and light hairspray if needed." },
    ], dailyStylingMinutes: 8, maintenanceWeeks: 4,
  },
};

export function getSalonGuide(slug: string) {
  return guides[slug as StarterHairstyleSlug];
}
