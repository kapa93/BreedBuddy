import type { ImageSourcePropType } from "react-native";
import type { BreedColorKey } from "../theme";

export type BreedKey = "aussie" | "husky" | "golden" | "frenchie" | "pitbull" | "lab";

export type PackItem = {
  key: BreedKey;
  label: string;
  image: ImageSourcePropType;
};

export type QuestionCardData = {
  id: string;
  author: string;
  authorMeta?: string;
  breedKey: BreedColorKey;
  badge?: string;
  title: string;
  preview?: string;
  images?: ImageSourcePropType[];
  likeCount?: number;
  loveCount?: number;
  hahaCount?: number;
  answerCount?: number;
};
