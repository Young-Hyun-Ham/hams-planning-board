export type Layer = {
  id: string;
  name: string;
  kind:
    | "page"
    | "section"
    | "layer"
    | "text"
    | "image"
    | "clipboard"
    | "button";
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

export type EditableContent = {
  logo: string;
  menuAbout: string;
  menuProjects: string;
  menuContact: string;
  eyebrow: string;
  heading: string;
  description: string;
  cta: string;
};

export type UpdateContent = <K extends keyof EditableContent>(
  key: K,
  value: EditableContent[K],
) => void;
