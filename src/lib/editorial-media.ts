/** Unsplash editorial photos. Not manufacturer product imagery. */

export const editorialPhotos = {
  hero: {
    src: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2000&q=80",
    alt: "Editorial photograph of a sports car in motion",
    credit: "Unsplash",
  },
  "tesla-model-3": {
    src: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1400&q=80",
    alt: "Editorial photograph of an electric sedan — not official Tesla imagery",
    credit: "Unsplash",
  },
  "tesla-roadster": {
    src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80",
    alt: "Editorial sports-car photograph used as a Roadster stand-in — not an official Tesla image",
    credit: "Unsplash",
  },
  "bugatti-chiron": {
    src: "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1400&q=80",
    alt: "Editorial hypercar photograph — not official Bugatti imagery",
    credit: "Unsplash",
  },
  "lamborghini-revuelto": {
    src: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1400&q=80",
    alt: "Editorial supercar photograph — not official Lamborghini imagery",
    credit: "Unsplash",
  },
  "porsche-911-gt3": {
    src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80",
    alt: "Editorial sports-car photograph — not official Porsche imagery",
    credit: "Unsplash",
  },
  "mclaren-senna": {
    src: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1400&q=80",
    alt: "Editorial hypercar photograph — not official McLaren imagery",
    credit: "Unsplash",
  },
  "ferrari-sp38": {
    src: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1400&q=80",
    alt: "Editorial sports-car photograph — not official Ferrari imagery",
    credit: "Unsplash",
  },
  "koenigsegg-jesko-absolut": {
    src: "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1400&q=80",
    alt: "Editorial hypercar photograph — not official Koenigsegg imagery",
    credit: "Unsplash",
  },
  "pagani-huayra": {
    src: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1400&q=80",
    alt: "Editorial hypercar photograph — not official Pagani imagery",
    credit: "Unsplash",
  },
  "aston-martin-valkyrie": {
    src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80",
    alt: "Editorial hypercar photograph — not official Aston Martin imagery",
    credit: "Unsplash",
  },
  "mercedes-amg-one": {
    src: "https://images.unsplash.com/photo-1618843479313-40f8aa5d71c6?auto=format&fit=crop&w=1400&q=80",
    alt: "Editorial Mercedes photograph — not official AMG ONE imagery",
    credit: "Unsplash",
  },
  "mercedes-maybach-s-class": {
    src: "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?auto=format&fit=crop&w=1400&q=80",
    alt: "Editorial luxury sedan photograph — not official Maybach imagery",
    credit: "Unsplash",
  },
  "mercedes-maybach-gls-600": {
    src: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1400&q=80",
    alt: "Editorial luxury SUV photograph — not official Maybach GLS imagery",
    credit: "Unsplash",
  },
} as const;

export function photoFor(slug: string) {
  if (slug in editorialPhotos) {
    return editorialPhotos[slug as keyof typeof editorialPhotos];
  }
  return editorialPhotos.hero;
}
