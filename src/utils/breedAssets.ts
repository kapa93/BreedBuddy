import type { ImageSourcePropType } from "react-native";
import type { BreedEnum } from "@/types";
import type { BreedColorKey } from "@/theme";
import { BREED_LABELS } from "@/utils/breed";

/** Local breed images for pack grid (assets/breeds) */
const BREED_PACK_IMAGES: Record<BreedEnum, ImageSourcePropType> = {
  AUSTRALIAN_SHEPHERD: require("../../assets/breeds/aussie-head.png"),
  GERMAN_SHEPHERD: require("../../assets/breeds/german-shepherd.png"),
  HUSKY: require("../../assets/breeds/husky.png"),
  GOLDEN_DOODLE: require("../../assets/breeds/golden-doodle.png"),
  GOLDEN_RETRIEVER: require("../../assets/breeds/golden.png"),
  MIXED_BREED: require("../../assets/breeds/mixed-breed.png"),
  FRENCH_BULLDOG: require("../../assets/breeds/frenchie.png"),
  PIT_BULL: require("../../assets/breeds/pitbull.png"),
  LABRADOR_RETRIEVER: require("../../assets/breeds/lab.png"),
  LABRADOODLE: require("../../assets/breeds/labradoodle.png"),
};

/** Map BreedEnum to theme BreedColorKey */
export const BREED_TO_COLOR: Record<BreedEnum, BreedColorKey> = {
  AUSTRALIAN_SHEPHERD: "aussie",
  GERMAN_SHEPHERD: "german",
  HUSKY: "husky",
  GOLDEN_DOODLE: "goldendoodle",
  GOLDEN_RETRIEVER: "golden",
  MIXED_BREED: "mixed",
  FRENCH_BULLDOG: "frenchie",
  PIT_BULL: "pitbull",
  LABRADOR_RETRIEVER: "lab",
  LABRADOODLE: "labradoodle",
};

/** Breed hero banner images (Unsplash, optimized for 390x210) */
export const BREED_HERO_IMAGES: Record<BreedEnum, string> = {
  AUSTRALIAN_SHEPHERD:
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800",
  GERMAN_SHEPHERD:
    "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=800",
  HUSKY: "https://images.unsplash.com/photo-1611003228941-98852ba62227?w=800",
  GOLDEN_DOODLE:
    "https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=800",
  GOLDEN_RETRIEVER:
    "https://images.unsplash.com/photo-1633722715463-d30f4f325e40?w=800",
  MIXED_BREED:
    "https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=800",
  FRENCH_BULLDOG:
    "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800",
  PIT_BULL: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800",
  LABRADOR_RETRIEVER:
    "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800",
  LABRADOODLE:
    "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800",
};

/** Local asset for Australian Shepherd feed banner */
const AUSSIE_FEED_IMAGE = require("../../assets/aussie-feed.jpeg");

/** Get breed hero image source - uses local asset for Australian Shepherd, URI for others */
export function getBreedHeroImageSource(breed: BreedEnum) {
  if (breed === "AUSTRALIAN_SHEPHERD") {
    return AUSSIE_FEED_IMAGE;
  }
  return { uri: BREED_HERO_IMAGES[breed] } as const;
}

export type PackItem = {
  breed: BreedEnum;
  label: string;
  image: ImageSourcePropType;
  breedColor: BreedColorKey;
};

const PACK_BREED_ORDER: BreedEnum[] = [
  "LABRADOR_RETRIEVER",
  "HUSKY",
  "GOLDEN_RETRIEVER",
  "FRENCH_BULLDOG",
  "PIT_BULL",
  "AUSTRALIAN_SHEPHERD",
  "GOLDEN_DOODLE",
  "LABRADOODLE",
  "GERMAN_SHEPHERD",
  "MIXED_BREED",
];

export function getPackItems(): PackItem[] {
  return PACK_BREED_ORDER.map((breed) => ({
    breed,
    label: BREED_LABELS[breed],
    image: BREED_PACK_IMAGES[breed],
    breedColor: BREED_TO_COLOR[breed],
  }));
}
