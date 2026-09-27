/**
 * Every word on the site.
 *
 * Editorial rule for this build: the name is not the headline. The work and
 * the position lead; "Mehdi Belhous" appears once in the nav at label size
 * and once in the byline at the foot. One idea per screen, at most three
 * sentences — `long` fields carry the full detail and surface only on /text,
 * which exists so recruiters can read everything without the main page
 * having to say it.
 */

export const site = {
  name: 'Mehdi Belhous',
  initials: 'MB',
  role: 'Designer 3D & ingénieur mécanicien',
  location: 'Île-de-France',
  status: 'Disponible — CDI',
  year: '2026',
  url: 'https://mehdibelhous.com',
  description:
    'Designer 3D et ingénieur mécanicien. De la contrainte à l’image : cahier des charges, simulation, modélisation, rendu, animation.',
};

/** The hero says one thing. The argument behind it gets its own screen. */
export const lead = {
  /* Authored line breaks: a six-word statement is set, not wrapped. */
  punch: ['De la contrainte', 'à l’image.'],
  problem: 'La conception produit s’est scindée : le calcul d’un côté, l’image de l’autre.',
  belief: 'Un même objet peut tenir les deux.',
};

export const approach = [
  'Ingénieur mécanicien devenu designer 3D.',
  'Je tiens la chaîne entière — cahier des charges, simulation, modélisation, rendu, animation — sans la passer à quelqu’un d’autre au milieu.',
];

/** Stacked, one word per line. */
export const mantra = ['Technicité.', 'Clarté.', 'Optimisation.', 'Innovation.'];

/**
 * Three terms taken pairwise — the actual pipeline, stated as relations.
 * Form comes from constraint meeting material; surface from material meeting
 * light; image from light meeting the constraint that framed it.
 */
export const triad = [
  { name: 'Forme', a: 'Contrainte', b: 'Matière' },
  { name: 'Surface', a: 'Matière', b: 'Lumière' },
  { name: 'Image', a: 'Lumière', b: 'Contrainte' },
];

export const sections = [
  { id: 'approche', label: 'Approche' },
  { id: 'principes', label: 'Principes' },
  { id: 'travaux', label: 'Travaux' },
  { id: 'parcours', label: 'Parcours' },
  { id: 'contact', label: 'Contact' },
];

/**
 * `featured` projects get a full screen with a visual; the rest share a
 * short list underneath. `line` is one sentence for the main page, `long`
 * the full description for /text.
 *
 * Visuals — drop the file in public/work/ and set the path:
 *   image  '/work/prothese.jpg'   still (JPG/WebP, 16:10, ~2400 px wide)
 *   video  '/work/prothese.mp4'   optional loop; `image` becomes its poster
 *   href   'https://…'            optional case study (Behance, YouTube…)
 * Until `image` is set, the slot shows a drawing-sheet placeholder.
 */
export const projects = [
  {
    featured: true,
    kicker: 'Ingénierie biomédicale',
    name: 'Prothèse discale',
    line: 'Un implant L4-L5 dessiné sous charge : la simulation décide de la forme, pas l’inverse.',
    long: "Conception d'un implant discal L4-L5 — noyau HDPE, coque inox — à partir d'une modélisation biomécanique du rachis lombaire. Simulation de charge par éléments finis pour valider la tenue structurelle sous compression et flexion.",
    stack: ['ANSYS', 'FEA', 'Solidworks'],
    image: null,
    video: null,
    href: null,
  },
  {
    featured: true,
    kicker: 'Scénographie générative',
    name: 'Implantation automatisée',
    line: 'Blender piloté par l’IA : l’espace de vente se remplit seul, au bon goût de la marque.',
    long: "Outil reliant Blender et l'IA générative pour proposer des implantations scénographiques cohérentes dans des espaces de vente, puis produire un rendu photoréaliste calé sur l'identité de la marque.",
    stack: ['Blender', 'Python', 'ComfyUI'],
    image: null,
    video: null,
    href: null,
  },
  {
    featured: true,
    kicker: 'Hardware',
    name: 'Pédale générative',
    line: 'On décrit le son en une phrase, la pédale le compile et le joue.',
    long: 'Pédale multi-effets pour musicien en home studio : une description en langage naturel produit une signal chain complète, compilée et chargée instantanément sur le hardware.',
    stack: ['ESP32', 'Daisy Seed', 'LLM API'],
    image: null,
    video: null,
    href: null,
  },
  {
    featured: true,
    kicker: 'Installation immersive',
    name: 'Projection 360°',
    line: 'Le LiDAR lit la salle, l’image répond à la distance du visiteur.',
    long: "Installation temps réel pour salle de projection 360° : détection de silhouette par caméras LiDAR et génération procédurale d'un contenu qui réagit à la distance entre le visiteur et l'écran.",
    stack: ['TouchDesigner', 'LiDAR', 'Mapping'],
    image: null,
    video: null,
    href: null,
  },
  {
    kicker: 'Design fiction',
    name: 'Protocole HCT',
    line: 'Une certification qui distingue l’effort créatif humain du reste, et le prouve.',
    long: "Exploration prospective d'un futur proche : un système de certification « Human Cognitive Traces » qui authentifie l'effort créatif humain à partir de signaux biométriques et comportementaux, consigné sur registre distribué.",
    stack: ['Blockchain', 'UX Research'],
  },
  {
    kicker: 'Creative technology',
    name: 'Cartographie prédictive',
    line: 'Un agent lit l’actualité, la géolocalise, et projette sa propagation à 24 h sur un globe.',
    long: "Agent autonome qui dépouille l'actualité environnementale, géolocalise chaque événement, le croise aux données météo pour estimer sa propagation à 24 h, et restitue le tout sur un globe temps réel.",
    stack: ['n8n', 'Groq', 'TouchDesigner'],
  },
  {
    kicker: 'Activation culturelle',
    name: 'Médiation jouable',
    line: 'Un mod coopératif transforme la visite culturelle en partie à jouer.',
    long: "Campagne d'activation culturelle bâtie autour d'un mod PvE coopératif, doublée d'une stratégie de médiation in-situ qui transforme la visite en expérience jouable.",
    stack: ['Game design', 'Médiation'],
  },
];

export const track = [
  { from: '2024', to: '2025', title: 'Designer 3D & web', at: 'ExpertCN', kind: 'Alternance',
    long: "Direction visuelle et production 3D pour une marque B2B : modélisation produit, motion design, refonte de l'identité et intégration web temps réel." },
  { from: '2022', to: '2025', title: 'Designer 3D & motion · UI/UX', at: 'Freelance', kind: 'Indépendant',
    long: 'Animations promotionnelles, visuels produit et prototypes interactifs pour des clients B2B et B2C, du storyboard au livrable final.' },
  { from: '2022', to: '2023', title: 'Ingénieur fabrication mécanique', at: 'ETSH', kind: 'Poste',
    long: "Rédaction de cahiers des charges, programmation CNC et contrôle qualité en atelier." },
];

export const studies = [
  { from: '2023', to: '2025', title: 'Design digital & technologies créatives', at: 'ESD Paris' },
  { from: '2017', to: '2022', title: 'Ingénieur en construction mécanique', at: 'École Polytechnique de Constantine' },
];

/** One run, not a four-column grid with bullets. */
export const tools = [
  'Blender', 'Solidworks', 'Rhino 3D', 'Plasticity', 'ANSYS', 'Impression 3D',
  'TouchDesigner', 'After Effects', 'Premiere Pro', 'DaVinci Resolve',
  'Three.js', 'Figma', 'Webflow', 'ComfyUI', 'n8n', 'Python', 'Git',
];

export const contact = [
  { label: 'Email', value: 'mehdi.belhous11@gmail.com', href: 'mailto:mehdi.belhous11@gmail.com', primary: true },
  { label: 'Téléphone', value: '+33 7 48 52 95 99', href: 'tel:+33748529599' },
  { label: 'Behance', value: 'behance.net', href: 'https://www.behance.net/', external: true },
  { label: 'YouTube', value: 'youtube.com', href: 'https://www.youtube.com/', external: true },
];

/**
 * The closing statement. It describes the mark — two triangles, one hollow
 * and one solid, sharing an edge — and so the position: calculation and
 * image, one edge in common.
 */
export const closing = ['Deux triangles.', 'Une arête commune.'];

/** What the mark is, for the colophon on /text. */
export const markNote =
  'Le signe est un parallélogramme coupé en deux triangles qui partagent une arête : l’un évidé, comme une structure avant le calcul, l’autre plein, comme la pièce rendue. Une plaque et sa poche d’allègement, ou un quad triangulé, à moitié en fil de fer.';

export const byline =
  'Mehdi Belhous, designer 3D et ingénieur mécanicien. Île-de-France, disponible en CDI.';
