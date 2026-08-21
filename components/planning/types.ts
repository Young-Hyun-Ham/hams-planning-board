export type ElementKind =
  | "page"
  | "section"
  | "layer"
  | "text"
  | "image"
  | "clipboard"
  | "button"
  | "checkbox"
  | "radio"
  | "select"
  | "icon";

export type IconType = "" | "svg" | "mui";
export type OptionOrientation = "horizontal" | "vertical";
export type LayerOption = { display: string; value: string };

export type Layer = {
  id: string;
  name: string;
  kind: ElementKind;
  iconType?: IconType;
  iconInstance?: string;
  iconSize?: number;
  iconColor?: string;
  optionLabel?: string;
  optionCount?: number;
  optionOrientation?: OptionOrientation;
  optionItems?: LayerOption[];
  template?: boolean;
  visible?: boolean;
  locked?: boolean;
  children?: Layer[];
};

export type Device = "desktop" | "tablet" | "mobile";
export type LayerSize = { width: number; height: number };
export type LayerPosition = { x: number; y: number };
export type LayerEffect =
  | "none"
  | "shadow"
  | "soft-shadow"
  | "blur"
  | "grayscale"
  | "text-shadow";
export type LayerStyle = {
  fontSize?: number;
  lineHeight?: number;
  fontWeight?: number;
  color?: string;
  backgroundColor?: string;
  opacity?: number;
  borderRadius?: number;
  effect?: LayerEffect;
};
