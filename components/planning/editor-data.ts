import type { EditableContent, Layer } from "./types";

export const layers: Layer[] = [
  { id: "page", name: "Page", kind: "page", children: [] },
];

// Legacy component compatibility only. New documents store all text in layerText.
export const initialContent: EditableContent = {
  logo: "",
  menuAbout: "",
  menuProjects: "",
  menuContact: "",
  eyebrow: "",
  heading: "",
  description: "",
  cta: "",
};

export function findLayerName(id: string, items = layers): string {
  for (const item of items) {
    if (item.id === id) return item.name;
    const found = item.children && findLayerName(id, item.children);
    if (found) return found;
  }
  return "";
}

export function findLayerById(id: string, items = layers): Layer | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const found = item.children && findLayerById(id, item.children);
    if (found) return found;
  }
}

export function createPublishingCode() {
  return "";
}
