"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasEditor } from "@/components/planning/canvas-editor";
import { EditorHeader } from "@/components/planning/editor-header";
import {
  findLayerById,
  findLayerName,
  layers as initialLayers,
} from "@/components/planning/editor-data";
import { LeftPanel } from "@/components/planning/left-panel";
import { RightPanel } from "@/components/planning/right-panel";
import {
  ReviewDialog,
  type ReviewDialogAction,
} from "@/components/planning/review-dialog";
import type {
  GeneratedDocument,
  GeneratedElement,
  Layer,
  LayerPosition,
  LayerSize,
  LayerStyle,
  PreviewDocument,
} from "@/components/planning/types";
import { useUserStore } from "@/store";
import type { ProjectAccessLevel } from "@/types/project-sharing";

const defaultLayerSize = (kind: Layer["kind"]): LayerSize =>
  kind === "page"
    ? { width: 860, height: 560 }
    : kind === "section" || kind === "layer"
      ? { width: 150, height: 100 }
      : kind === "text" || kind === "button" || kind === "select"
        ? { width: 110, height: 32 }
        : kind === "checkbox" || kind === "radio"
          ? { width: 140, height: 32 }
          : kind === "icon"
            ? { width: 32, height: 32 }
            : { width: 110, height: 80 };

type EditorSnapshot = {
  title: string;
  layers: Layer[];
  sizes: Record<string, LayerSize>;
  positions: Record<string, LayerPosition>;
  layerText: Record<string, string>;
  layerImages: Record<string, string>;
  layerStyles: Record<string, LayerStyle>;
};

const cloneEditorSnapshot = (snapshot: EditorSnapshot): EditorSnapshot =>
  structuredClone(snapshot);

const isSameEditorSnapshot = (left: EditorSnapshot, right: EditorSnapshot) =>
  left.title === right.title &&
  left.layers === right.layers &&
  left.sizes === right.sizes &&
  left.positions === right.positions &&
  left.layerText === right.layerText &&
  left.layerImages === right.layerImages &&
  left.layerStyles === right.layerStyles;

function findPageId(
  items: Layer[],
  id: string,
  pageId = "",
): string | undefined {
  for (const item of items) {
    const currentPageId = item.kind === "page" ? item.id : pageId;
    if (item.id === id) return currentPageId;
    const found = item.children && findPageId(item.children, id, currentPageId);
    if (found) return found;
  }
}

function createAiDocument(
  title: string,
  layers: Layer[],
  sizes: Record<string, LayerSize>,
  positions: Record<string, LayerPosition>,
  layerText: Record<string, string>,
  layerStyles: Record<string, LayerStyle>,
  selected: string,
): GeneratedDocument {
  const pages = layers
    .filter((layer) => layer.kind === "page")
    .map((page, pageIndex) => {
      const pageSize = sizes[page.id] ?? defaultLayerSize("page");
      const elements: GeneratedElement[] = [];
      const appendElements = (items: Layer[], parentId: string) => {
        items.forEach((layer) => {
          if (layer.kind === "page" || layer.template) return;
          const size = sizes[layer.id] ?? defaultLayerSize(layer.kind);
          const position = positions[layer.id] ?? { x: 0, y: 0 };
          const style = layerStyles[layer.id] ?? {};
          elements.push({
            id: layer.id,
            parentId,
            name: layer.name,
            kind: layer.kind,
            text: layerText[layer.id] ?? layer.name,
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
            fontSize: style.fontSize ?? 14,
            lineHeight: style.lineHeight ?? 1.4,
            fontWeight: style.fontWeight ?? 400,
            color: style.color ?? "#18181b",
            backgroundColor: style.backgroundColor ?? "transparent",
            borderColor: style.borderColor ?? "transparent",
            borderWidth: style.borderWidth ?? 0,
            opacity: style.opacity ?? 1,
            borderRadius: style.borderRadius ?? 0,
            textAlign: style.textAlign ?? "left",
            effect: style.effect ?? "none",
            iconInstance: layer.iconInstance ?? "",
            iconSize: layer.iconSize ?? 22,
            iconType: layer.iconType ?? "",
            iconColor: layer.iconColor ?? style.color ?? "#18181b",
            optionLabel: layer.optionLabel ?? "Option",
            optionCount: Math.max(1, layer.optionCount ?? 1),
            optionOrientation: layer.optionOrientation ?? "horizontal",
            optionItems: layer.optionItems ?? [],
            visible: layer.visible !== false,
            locked: layer.locked === true,
          });
          if (layer.children) appendElements(layer.children, layer.id);
        });
      };
      appendElements(page.children ?? [], page.id);
      return {
        id: page.id,
        name: page.name,
        x: positions[page.id]?.x ?? pageIndex * 940,
        y: positions[page.id]?.y ?? 0,
        width: pageSize.width,
        height: pageSize.height,
        backgroundColor: layerStyles[page.id]?.backgroundColor ?? "#f7f4ef",
        visible: page.visible !== false,
        locked: page.locked === true,
        elements,
      };
    });
  return {
    title,
    activePageId: findPageId(layers, selected) ?? pages[0]?.id ?? "page",
    pages,
  };
}

function createEditorState(
  document: GeneratedDocument,
  currentImages: Record<string, string>,
) {
  const sizes: Record<string, LayerSize> = {};
  const positions: Record<string, LayerPosition> = {};
  const text: Record<string, string> = {};
  const styles: Record<string, LayerStyle> = {};
  const images: Record<string, string> = {};
  const layers: Layer[] = document.pages.map((page) => {
    sizes[page.id] = { width: page.width, height: page.height };
    positions[page.id] = { x: page.x, y: page.y };
    styles[page.id] = { backgroundColor: page.backgroundColor };
    const byId = new Map<string, Layer>();
    page.elements.forEach((element) => {
      const container = element.kind === "section" || element.kind === "layer";
      byId.set(element.id, {
        id: element.id,
        name: element.name,
        kind: element.kind,
        iconType: element.iconType,
        iconInstance: element.iconInstance,
        iconSize: element.iconSize,
        iconColor: element.iconColor,
        optionLabel: element.optionLabel,
        optionCount: element.optionCount,
        optionOrientation: element.optionOrientation,
        optionItems: element.optionItems,
        visible: element.visible,
        locked: element.locked,
        children: container ? [] : undefined,
      });
      sizes[element.id] = { width: element.width, height: element.height };
      positions[element.id] = { x: element.x, y: element.y };
      styles[element.id] = {
        fontSize: element.fontSize,
        lineHeight: element.lineHeight,
        fontWeight: element.fontWeight,
        color: element.color,
        backgroundColor: element.backgroundColor,
        borderColor: element.borderColor,
        borderWidth: element.borderWidth,
        opacity: element.opacity,
        borderRadius: element.borderRadius,
        textAlign: element.textAlign,
        effect: element.effect,
      };
      if (element.kind === "text" || element.kind === "button") {
        text[element.id] = element.text;
      }
      if (
        (element.kind === "image" || element.kind === "clipboard") &&
        currentImages[element.id]
      )
        images[element.id] = currentImages[element.id];
    });
    const children: Layer[] = [];
    page.elements.forEach((element) => {
      const layer = byId.get(element.id);
      if (!layer) return;
      const parent = byId.get(element.parentId);
      if (parent && (parent.kind === "section" || parent.kind === "layer")) {
        parent.children?.push(layer);
      } else {
        children.push(layer);
      }
    });
    return {
      id: page.id,
      name: page.name,
      kind: "page",
      visible: page.visible,
      locked: page.locked,
      children,
    };
  });
  return { layers, sizes, positions, text, styles, images };
}

export default function Home() {
  const aiEnabled = useUserStore((state) => state.user?.aiEnabled === true);
  const [selected, setSelected] = useState("page");
  const [selectedIds, setSelectedIds] = useState<string[]>(["page"]);
  const [selectionAnchor, setSelectionAnchor] = useState("page");
  const [layers, setLayers] = useState<Layer[]>(initialLayers);
  const [sizes, setSizes] = useState<Record<string, LayerSize>>({});
  const [positions, setPositions] = useState<Record<string, LayerPosition>>({});
  const [layerText, setLayerText] = useState<Record<string, string>>({});
  const [layerImages, setLayerImages] = useState<Record<string, string>>({});
  const [layerStyles, setLayerStyles] = useState<Record<string, LayerStyle>>(
    {},
  );
  const [prompt, setPrompt] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("");
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelWarning, setModelWarning] = useState("");
  const [aiHistoryVersion, setAiHistoryVersion] = useState(0);
  const [errorSnackbar, setErrorSnackbar] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState<string>();
  const [projectAccess, setProjectAccess] =
    useState<ProjectAccessLevel>("owner");
  const [projectStatus, setProjectStatus] = useState("draft");
  const [isReviewer, setIsReviewer] = useState(false);
  const [reviewDialog, setReviewDialog] = useState<{
    action: ReviewDialogAction;
    loading: boolean;
    error: string;
  } | null>(null);
  const [documentTitle, setDocumentTitle] = useState("Page");
  const [saved, setSaved] = useState("저장됨");
  const [focusRequestKey, setFocusRequestKey] = useState(0);
  const [focusPageId, setFocusPageId] = useState("page");
  const currentEditorSnapshot = useMemo<EditorSnapshot>(
    () => ({
      title: documentTitle,
      layers,
      sizes,
      positions,
      layerText,
      layerImages,
      layerStyles,
    }),
    [
      documentTitle,
      layers,
      sizes,
      positions,
      layerText,
      layerImages,
      layerStyles,
    ],
  );
  const undoHistory = useRef<EditorSnapshot[]>([]);
  const redoHistory = useRef<EditorSnapshot[]>([]);
  const activeSnapshot = useRef(currentEditorSnapshot);
  const historyGroupTimer = useRef<number | null>(null);
  const [historyStatus, setHistoryStatus] = useState({ undo: 0, redo: 0 });
  const selectedName = useMemo(
    () => findLayerName(selected, layers),
    [selected, layers],
  );
  const selectedLayer = useMemo(
    () => findLayerById(selected, layers),
    [selected, layers],
  );
  const clearHistoryGroupTimer = () => {
    if (historyGroupTimer.current === null) return;
    window.clearTimeout(historyGroupTimer.current);
    historyGroupTimer.current = null;
  };
  const refreshHistoryControls = () => {
    setHistoryStatus({
      undo: undoHistory.current.length,
      redo: redoHistory.current.length,
    });
  };
  const applyEditorSnapshot = (snapshot: EditorSnapshot) => {
    activeSnapshot.current = snapshot;
    setDocumentTitle(snapshot.title);
    setLayers(snapshot.layers);
    setSizes(snapshot.sizes);
    setPositions(snapshot.positions);
    setLayerText(snapshot.layerText);
    setLayerImages(snapshot.layerImages);
    setLayerStyles(snapshot.layerStyles);

    const nextSelected = findLayerById(selected, snapshot.layers)
      ? selected
      : (snapshot.layers.find((layer) => layer.kind === "page")?.id ?? "page");
    setSelected(nextSelected);
    setSelectedIds([nextSelected]);
    setSelectionAnchor(nextSelected);
  };
  const resetDocumentHistory = (snapshot: EditorSnapshot) => {
    clearHistoryGroupTimer();
    undoHistory.current = [];
    redoHistory.current = [];
    activeSnapshot.current = snapshot;
    refreshHistoryControls();
  };
  const undo = () => {
    clearHistoryGroupTimer();
    const snapshot = undoHistory.current.pop();
    if (!snapshot) return;
    redoHistory.current.push(cloneEditorSnapshot(activeSnapshot.current));
    if (redoHistory.current.length > 40) redoHistory.current.shift();
    applyEditorSnapshot(snapshot);
    setSaved("실행 취소됨");
    refreshHistoryControls();
  };
  const redo = () => {
    clearHistoryGroupTimer();
    const snapshot = redoHistory.current.pop();
    if (!snapshot) return;
    undoHistory.current.push(cloneEditorSnapshot(activeSnapshot.current));
    if (undoHistory.current.length > 40) undoHistory.current.shift();
    applyEditorSnapshot(snapshot);
    setSaved("다시 실행됨");
    refreshHistoryControls();
  };
  const openPreview = () => {
    const activePageId =
      findPageId(layers, selected) ??
      layers.find((layer) => layer.kind === "page")?.id ??
      "page";
    const previewDocument: PreviewDocument = {
      title: documentTitle,
      activePageId,
      layers,
      sizes,
      positions,
      layerText,
      layerImages,
      layerStyles,
    };
    const previewWindow = window.open("/preview", "_blank");
    if (!previewWindow) {
      setErrorSnackbar({
        id: Date.now(),
        message:
          "미리보기 창을 열 수 없습니다. 브라우저의 팝업 차단을 해제해 주세요.",
      });
      return;
    }

    const sendPreview = () => {
      if (previewWindow.closed) return;
      previewWindow.postMessage(
        { type: "plancraft:preview-document", document: previewDocument },
        window.location.origin,
      );
    };
    const retryTimers = [250, 750, 1500].map((delay) =>
      window.setTimeout(sendPreview, delay),
    );
    const cleanup = () => {
      window.removeEventListener("message", receiveReady);
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(cleanupTimer);
    };
    const receiveReady = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== previewWindow ||
        event.data?.type !== "plancraft:preview-ready"
      )
        return;
      sendPreview();
      cleanup();
    };
    window.addEventListener("message", receiveReady);
    const cleanupTimer = window.setTimeout(cleanup, 5000);
    sendPreview();
  };
  const selectLayer = (
    id: string,
    mode: "single" | "toggle" | "range" = "single",
    rangeIds: string[] = [],
  ) => {
    const nextSelectedIds =
      mode === "range" && rangeIds.length
        ? rangeIds
        : mode === "toggle"
          ? selectedIds.includes(id)
            ? selectedIds.length > 1
              ? selectedIds.filter((selectedId) => selectedId !== id)
              : selectedIds
            : [...selectedIds, id]
          : [id];
    const primaryId = nextSelectedIds.includes(id)
      ? id
      : (nextSelectedIds.at(-1) ?? id);
    setSelectedIds(nextSelectedIds);
    setSelected(primaryId);
    if (mode !== "range") setSelectionAnchor(id);
    if (findLayerById(primaryId, layers)?.kind === "page") {
      setFocusPageId(primaryId);
      setFocusRequestKey((current) => current + 1);
    }
  };

  useEffect(() => {
    if (!errorSnackbar) return;
    const timeout = window.setTimeout(() => setErrorSnackbar(null), 8_000);
    return () => window.clearTimeout(timeout);
  }, [errorSnackbar]);

  useEffect(() => {
    const previous = activeSnapshot.current;
    if (isSameEditorSnapshot(previous, currentEditorSnapshot)) return;

    if (historyGroupTimer.current === null) {
      undoHistory.current.push(cloneEditorSnapshot(previous));
      if (undoHistory.current.length > 40) undoHistory.current.shift();
      redoHistory.current = [];
    } else {
      window.clearTimeout(historyGroupTimer.current);
    }
    activeSnapshot.current = currentEditorSnapshot;
    historyGroupTimer.current = window.setTimeout(() => {
      historyGroupTimer.current = null;
    }, 350);
    refreshHistoryControls();
  }, [currentEditorSnapshot]);

  useEffect(() => () => {
    clearHistoryGroupTimer();
  });

  useEffect(() => {
    if (!aiEnabled) return;

    const controller = new AbortController();
    fetch("/api/ai/models", { signal: controller.signal })
      .then(async (response) => {
        const result = (await response.json()) as {
          models?: string[];
          defaultModel?: string;
          message?: string;
        };
        if (!response.ok || !result.models?.length) {
          throw new Error(
            result.message ?? "AI 모델 목록을 불러오지 못했습니다.",
          );
        }
        setModels(result.models);
        setModel(result.defaultModel ?? result.models[0] ?? "");
        setModelWarning("");
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setModelWarning(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setModelsLoading(false);
      });
    return () => controller.abort();
  }, [aiEnabled]);

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (
        selectedLayer?.kind !== "clipboard" &&
        selectedLayer?.kind !== "image"
      )
        return;
      const file = Array.from(event.clipboardData?.files ?? []).find((item) =>
        item.type.startsWith("image/"),
      );
      if (!file) return;
      event.preventDefault();
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setLayerImages((current) => ({
            ...current,
            [selected]: reader.result as string,
          }));
          setSaved("클립보드 이미지 붙여넣음");
        }
      };
      reader.readAsDataURL(file);
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [selected, selectedLayer?.kind]);

  const addLayer = (parentId: string, kind: Layer["kind"]) => {
    const id = `custom-${kind}-${Date.now()}`;
    const labels = {
      page: "New Page",
      layer: "New Layer",
      section: "New Section",
      text: "New Text",
      image: "New Image",
      clipboard: "Clipboard Image",
      button: "New Button",
      checkbox: "New Checkbox",
      radio: "New Radio",
      select: "New Select",
      icon: "New Icon",
    };
    const layer: Layer = {
      id,
      name: labels[kind],
      kind,
      ...(kind === "checkbox" || kind === "radio"
        ? {
            optionLabel: kind === "checkbox" ? "Checkbox" : "Radio",
            optionCount: 1,
            optionOrientation: "horizontal" as const,
            optionItems: [{ display: "Option 1", value: "Option" }],
          }
        : {}),
      children: kind === "layer" || kind === "section" ? [] : undefined,
    };
    const insertChild = (items: Layer[]): Layer[] =>
      items.map((item) =>
        item.id === parentId &&
        (item.kind === "page" ||
          item.kind === "section" ||
          item.kind === "layer")
          ? {
              ...item,
              children:
                kind === "section" || kind === "layer"
                  ? [
                      ...(item.children ?? []).filter(
                        (child) =>
                          child.kind === "section" || child.kind === "layer",
                      ),
                      layer,
                      ...(item.children ?? []).filter(
                        (child) =>
                          child.kind !== "section" && child.kind !== "layer",
                      ),
                    ]
                  : [...(item.children ?? []), layer],
            }
          : {
              ...item,
              children: item.children ? insertChild(item.children) : undefined,
            },
      );
    setLayers((current) => insertChild(current));
    const defaultSize =
      kind === "section" || kind === "layer"
        ? { width: 150, height: 100 }
        : kind === "text" || kind === "button" || kind === "select"
          ? { width: 110, height: 32 }
          : kind === "checkbox" || kind === "radio"
            ? { width: 140, height: 32 }
            : kind === "icon"
              ? { width: 32, height: 32 }
              : { width: 110, height: 80 };
    setSizes((current) => ({ ...current, [id]: defaultSize }));
    setPositions((current) => ({ ...current, [id]: { x: 0, y: 0 } }));
    setSelected(id);
    setSelectedIds([id]);
    setSelectionAnchor(id);
  };
  const moveLayersToParent = (ids: string[], parentId: string) => {
    const movableIds = ids.filter(
      (id) => findLayerById(id, layers)?.kind !== "page",
    );
    const target = findLayerById(parentId, layers);
    if (
      !movableIds.length ||
      !target ||
      !["page", "layer", "section"].includes(target.kind)
    )
      return;

    const containsId = (layer: Layer, id: string): boolean =>
      layer.id === id ||
      Boolean(layer.children?.some((child) => containsId(child, id)));
    const topLevelIds = movableIds.filter((id) => {
      return !movableIds.some((otherId) => {
        if (otherId === id) return false;
        const other = findLayerById(otherId, layers);
        return other ? containsId(other, id) : false;
      });
    });
    if (
      topLevelIds.includes(parentId) ||
      topLevelIds.some((id) => {
        const layer = findLayerById(id, layers);
        return layer ? containsId(layer, parentId) : false;
      })
    )
      return;

    const pageRelativePositions = new Map<string, LayerPosition>();
    const collectRelativePositions = (
      items: Layer[],
      parentPosition: LayerPosition,
    ) => {
      items.forEach((item) => {
        const localPosition = positions[item.id] ?? { x: 0, y: 0 };
        const relativePosition =
          item.kind === "page"
            ? { x: 0, y: 0 }
            : {
                x: parentPosition.x + localPosition.x,
                y: parentPosition.y + localPosition.y,
              };
        pageRelativePositions.set(item.id, relativePosition);
        if (item.children) {
          collectRelativePositions(item.children, relativePosition);
        }
      });
    };
    collectRelativePositions(layers, { x: 0, y: 0 });
    const targetPosition = pageRelativePositions.get(parentId) ?? {
      x: 0,
      y: 0,
    };
    const movedPositions = Object.fromEntries(
      topLevelIds.map((id) => {
        const currentPosition = pageRelativePositions.get(id) ?? { x: 0, y: 0 };
        return [
          id,
          {
            x: currentPosition.x - targetPosition.x,
            y: currentPosition.y - targetPosition.y,
          },
        ];
      }),
    ) as Record<string, LayerPosition>;

    const moved: Layer[] = [];
    const removeMoved = (items: Layer[]): Layer[] =>
      items.flatMap((item) => {
        if (topLevelIds.includes(item.id)) {
          moved.push(item);
          return [];
        }
        return [
          {
            ...item,
            children: item.children ? removeMoved(item.children) : undefined,
          },
        ];
      });
    const insertMoved = (items: Layer[]): Layer[] =>
      items.map((item) => {
        if (item.id === parentId) {
          const currentChildren = item.children ?? [];
          const movedContainers = moved.filter(
            (child) => child.kind === "section" || child.kind === "layer",
          );
          const movedElements = moved.filter(
            (child) => child.kind !== "section" && child.kind !== "layer",
          );
          const firstElementIndex = currentChildren.findIndex(
            (child) => child.kind !== "section" && child.kind !== "layer",
          );
          const containerInsertIndex =
            firstElementIndex < 0 ? currentChildren.length : firstElementIndex;
          return {
            ...item,
            children: [
              ...currentChildren.slice(0, containerInsertIndex),
              ...movedContainers,
              ...currentChildren.slice(containerInsertIndex),
              ...movedElements,
            ],
          };
        }
        return {
          ...item,
          children: item.children ? insertMoved(item.children) : undefined,
        };
      });

    const withoutMoved = removeMoved(layers);
    setLayers(insertMoved(withoutMoved));
    setPositions((current) => ({ ...current, ...movedPositions }));
    setSelectedIds(topLevelIds);
    setSelected(topLevelIds.at(-1) ?? parentId);
    setSelectionAnchor(topLevelIds.at(-1) ?? parentId);
    if (target.kind === "page") {
      setFocusPageId(target.id);
      setFocusRequestKey((current) => current + 1);
    }
    setSaved("레이어 위치 변경됨");
  };
  const deleteFromTree = (items: Layer[], id: string): Layer[] =>
    items
      .filter((item) => item.id !== id)
      .map((item) => ({
        ...item,
        children: item.children ? deleteFromTree(item.children, id) : undefined,
      }));
  const renameLayer = (id: string, name: string) => {
    const rename = (items: Layer[]): Layer[] =>
      items.map((item) =>
        item.id === id
          ? { ...item, name }
          : {
              ...item,
              children: item.children ? rename(item.children) : undefined,
            },
      );
    setLayers((current) => rename(current));
    setSaved("이름 수정됨");
  };
  const reorderLayer = (
    id: string,
    action: "front" | "forward" | "backward" | "back",
  ) => {
    const reorder = (items: Layer[]): Layer[] => {
      const index = items.findIndex((item) => item.id === id);
      if (index >= 0) {
        const next = [...items],
          target = next[index];
        let destination = index;
        if (action === "front") destination = next.length - 1;
        if (action === "forward")
          destination = Math.min(next.length - 1, index + 1);
        if (action === "backward") destination = Math.max(0, index - 1);
        if (action === "back") destination = 0;
        next.splice(index, 1);
        next.splice(destination, 0, target);
        return next;
      }
      return items.map((item) => ({
        ...item,
        children: item.children ? reorder(item.children) : undefined,
      }));
    };
    setLayers((current) => reorder(current));
    setSaved("레이어 순서 수정됨");
  };
  const deleteLayer = (id: string) => {
    const target = findLayerById(id, layers);
    const pageCount = layers.filter((item) => item.kind === "page").length;
    if (target?.kind === "page" && pageCount <= 1) return;
    const remainingPages = layers.filter(
      (item) => item.kind === "page" && item.id !== id,
    );
    setLayers((current) => deleteFromTree(current, id));
    setSizes((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setPositions((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setLayerText((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setLayerImages((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setLayerStyles((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setSelected(remainingPages[0]?.id ?? "page");
    setSelectedIds([remainingPages[0]?.id ?? "page"]);
    setSelectionAnchor(remainingPages[0]?.id ?? "page");
  };
  const updateLayerState = (id: string, update: (layer: Layer) => Layer) => {
    const change = (items: Layer[]): Layer[] =>
      items.map((item) =>
        item.id === id
          ? update(item)
          : {
              ...item,
              children: item.children ? change(item.children) : undefined,
            },
      );
    setLayers((current) => change(current));
  };
  const toggleVisibility = (id: string) => {
    updateLayerState(id, (layer) => ({
      ...layer,
      visible: layer.visible === false,
    }));
    setSaved("표시 상태 변경됨");
  };
  const toggleLock = (id: string) => {
    updateLayerState(id, (layer) => ({ ...layer, locked: !layer.locked }));
    setSaved("잠금 상태 변경됨");
  };
  const addPage = () => {
    const id = `custom-page-${Date.now()}`;
    const pageCount = layers.filter((item) => item.kind === "page").length;
    setLayers((current) => [
      ...current,
      {
        id,
        name: `Page ${current.filter((item) => item.kind === "page").length + 1}`,
        kind: "page",
        children: [],
      },
    ]);
    setPositions((current) => ({
      ...current,
      [id]: { x: pageCount * 940, y: 0 },
    }));
    setSelected(id);
    setSelectedIds([id]);
    setSelectionAnchor(id);
    setFocusPageId(id);
    setFocusRequestKey((current) => current + 1);
    setSaved("새 페이지 추가됨");
  };
  const saveProject = async () => {
    if (projectStatus === "review") {
      setSaved("검토 중인 문서는 반려 또는 완료 전까지 저장할 수 없습니다.");
      return false;
    }
    if (projectAccess === "view") {
      setSaved("보기 전용 문서는 저장할 수 없습니다.");
      return false;
    }
    setSaving(true);
    setSaved("저장 중...");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          projectId,
          title: documentTitle,
          prompt,
          layers,
          sizes,
          positions,
          layerText,
          layerImages,
          layerStyles,
          selected,
        }),
      });
      const result = (await response.json()) as {
        id?: string;
        saved?: boolean;
        access?: ProjectAccessLevel;
        error?: string;
      };
      if (!response.ok || !result.saved)
        throw new Error(result.error ?? "저장에 실패했습니다.");
      if (result.id) setProjectId(result.id);
      if (result.access) setProjectAccess(result.access);
      setSaved("Firebase에 저장됨");
      return true;
    } catch (error) {
      setSaved(error instanceof Error ? error.message : "저장 실패");
      return false;
    } finally {
      setSaving(false);
    }
  };
  const deleteSelectedPage = () => {
    if (
      selectedLayer?.kind !== "page" ||
      layers.filter((item) => item.kind === "page").length <= 1
    )
      return;
    deleteLayer(selectedLayer.id);
    setSaved("페이지 삭제됨");
  };
  const openProject = async (id: string, signal?: AbortSignal) => {
    setSaved("불러오는 중...");
    const response = await fetch(
      `/api/projects?projectId=${encodeURIComponent(id)}`,
      { signal },
    );
    const result = (await response.json()) as {
      access?: ProjectAccessLevel;
      project?: {
        id: string;
        title?: unknown;
        prompt?: unknown;
        layers?: unknown;
        sizes?: unknown;
        positions?: unknown;
        layerText?: unknown;
        layerImages?: unknown;
        layerStyles?: unknown;
        selected?: unknown;
        status?: unknown;
        review?: { message?: unknown } | null;
        isReviewer?: unknown;
      };
      error?: string;
    };
    if (!response.ok || !result.project)
      throw new Error(result.error ?? "문서를 불러오지 못했습니다.");
    const project = result.project;
    if (!Array.isArray(project.layers))
      throw new Error("저장된 레이어 데이터가 올바르지 않습니다.");
    const nextLayers = project.layers as Layer[];
    const nextSizes =
      project.sizes && typeof project.sizes === "object"
        ? (project.sizes as Record<string, LayerSize>)
        : {};
    const nextPositions =
      project.positions && typeof project.positions === "object"
        ? (project.positions as Record<string, LayerPosition>)
        : {};
    const nextLayerText =
      project.layerText && typeof project.layerText === "object"
        ? (project.layerText as Record<string, string>)
        : {};
    const nextLayerImages =
      project.layerImages && typeof project.layerImages === "object"
        ? (project.layerImages as Record<string, string>)
        : {};
    const nextLayerStyles =
      project.layerStyles && typeof project.layerStyles === "object"
        ? (project.layerStyles as Record<string, LayerStyle>)
        : {};
    const nextTitle =
      typeof project.title === "string" ? project.title : "Page";
    resetDocumentHistory({
      title: nextTitle,
      layers: nextLayers,
      sizes: nextSizes,
      positions: nextPositions,
      layerText: nextLayerText,
      layerImages: nextLayerImages,
      layerStyles: nextLayerStyles,
    });
    setLayers(nextLayers);
    setSizes(nextSizes);
    setPositions(nextPositions);
    setLayerText(nextLayerText);
    setLayerImages(nextLayerImages);
    setLayerStyles(nextLayerStyles);
    setPrompt(typeof project.prompt === "string" ? project.prompt : "");
    setDocumentTitle(nextTitle);
    setSelected(
      typeof project.selected === "string" ? project.selected : "page",
    );
    setSelectedIds([
      typeof project.selected === "string" ? project.selected : "page",
    ]);
    setSelectionAnchor(
      typeof project.selected === "string" ? project.selected : "page",
    );
    setProjectId(project.id);
    setProjectAccess(result.access ?? "view");
    const nextProjectStatus =
      typeof project.status === "string" ? project.status : "draft";
    const reviewMessage =
      typeof project.review?.message === "string"
        ? project.review.message.trim()
        : "";
    setProjectStatus(nextProjectStatus);
    setIsReviewer(project.isReviewer === true);
    setSaved(
      reviewMessage && nextProjectStatus === "rejected"
        ? `반려 의견: ${reviewMessage}`
        : reviewMessage && nextProjectStatus === "complete"
          ? `완료 의견: ${reviewMessage}`
          : result.access === "view"
            ? "보기 전용으로 불러옴"
            : "Firebase에서 불러옴",
    );
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const projectIdParam = searchParams.get("projectId");
    const templateName = searchParams.get("template");
    if (!projectIdParam && !templateName) return;

    const controller = new AbortController();
    if (projectIdParam) {
      Promise.resolve()
        .then(() => openProject(projectIdParam, controller.signal))
        .catch((error) => {
          if (error instanceof Error && error.name !== "AbortError") {
            setSaved(error.message);
            setErrorSnackbar({ id: Date.now(), message: error.message });
          }
        });
      return () => controller.abort();
    }

    fetch(`/template-data?template=${encodeURIComponent(templateName!)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          template?: GeneratedDocument;
          error?: string;
        };
        if (!response.ok || !result.template) {
          throw new Error(result.error ?? "템플릿을 불러오지 못했습니다.");
        }
        const nextState = createEditorState(result.template, {});
        const activePageId =
          result.template.activePageId || nextState.layers[0]?.id || "page";
        const snapshot = {
          title: result.template.title,
          layers: nextState.layers,
          sizes: nextState.sizes,
          positions: nextState.positions,
          layerText: nextState.text,
          layerImages: nextState.images,
          layerStyles: nextState.styles,
        };
        resetDocumentHistory(snapshot);
        applyEditorSnapshot(snapshot);
        setSelected(activePageId);
        setSelectedIds([activePageId]);
        setSelectionAnchor(activePageId);
        setFocusPageId(activePageId);
        setFocusRequestKey((current) => current + 1);
        setProjectId(undefined);
        setProjectAccess("owner");
        setProjectStatus("draft");
        setIsReviewer(false);
        setSaved("템플릿에서 새 문서 생성됨");
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setSaved(error.message);
          setErrorSnackbar({ id: Date.now(), message: error.message });
        }
      });
    return () => controller.abort();
    // URL의 최초 템플릿만 새 문서로 불러오며 편집 중 재실행하지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitReviewAction = async (values: {
    reviewerEmail: string;
    message: string;
  }) => {
    if (!reviewDialog) return;
    const action = reviewDialog.action;
    setReviewDialog((current) =>
      current ? { ...current, loading: true, error: "" } : current,
    );
    try {
      if (action === "save") {
        const documentSaved = await saveProject();
        if (!documentSaved) throw new Error("문서를 저장하지 못했습니다.");
        setProjectStatus("draft");
        setReviewDialog(null);
        return;
      }
      if (!projectId) throw new Error("문서를 먼저 저장해주세요.");
      if (!isReviewer) {
        const documentSaved = await saveProject();
        if (!documentSaved) {
          throw new Error(
            "문서를 먼저 저장하지 못해 승인 처리를 중단했습니다.",
          );
        }
      }
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...values }),
        },
      );
      const result = (await response.json()) as {
        status?: string;
        error?: string;
      };
      if (!response.ok || !result.status) {
        throw new Error(result.error ?? "검토 상태를 변경하지 못했습니다.");
      }
      setProjectStatus(result.status);
      setReviewDialog(null);
      setSaved(
        action === "request"
          ? "검토 요청됨"
          : action === "reject"
            ? "설계서 반려됨"
            : "설계서 완료됨",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "검토 상태 변경 실패";
      setReviewDialog((current) =>
        current ? { ...current, loading: false, error: message } : current,
      );
    }
  };

  const generate = async () => {
    if (projectAccess === "view") {
      setSaved("보기 전용 문서는 수정할 수 없습니다.");
      return;
    }
    const requestPrompt = prompt.trim();
    const requestedModel = model;
    if (!requestPrompt || !requestedModel) return;
    setGenerating(true);
    setErrorSnackbar(null);
    setSaved(`${model}이 화면을 설계하는 중...`);
    try {
      const currentDocument = createAiDocument(
        documentTitle,
        layers,
        sizes,
        positions,
        layerText,
        layerStyles,
        selected,
      );
      const response = await fetch("/api/generate-screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: requestPrompt,
          model: requestedModel,
          currentDocument,
        }),
      });
      const result = (await response.json()) as {
        document?: GeneratedDocument;
        model?: string;
        error?: string;
      };
      if (!response.ok || !result.document) {
        throw new Error(result.error ?? "AI 화면을 생성하지 못했습니다.");
      }

      const nextDocument = result.document;
      const nextState = createEditorState(nextDocument, layerImages);
      const nextLayers = nextState.layers;
      const nextSizes = nextState.sizes;
      const nextPositions = nextState.positions;
      const nextText = nextState.text;
      const nextStyles = nextState.styles;
      const nextImages = nextState.images;
      const pageId =
        nextLayers.find((page) => page.id === nextDocument.activePageId)?.id ??
        nextLayers.at(-1)?.id ??
        "page";

      setLayers(nextLayers);
      setSizes(nextSizes);
      setPositions(nextPositions);
      setLayerText(nextText);
      setLayerImages(nextImages);
      setLayerStyles(nextStyles);
      setDocumentTitle(nextDocument.title);
      setSelected(pageId);
      setSelectedIds([pageId]);
      setSelectionAnchor(pageId);
      setFocusPageId(pageId);
      setFocusRequestKey((current) => current + 1);
      const saveResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          projectId,
          title: nextDocument.title,
          prompt: "",
          layers: nextLayers,
          sizes: nextSizes,
          positions: nextPositions,
          layerText: nextText,
          layerImages: nextImages,
          layerStyles: nextStyles,
          selected: pageId,
        }),
      });
      const saveResult = (await saveResponse.json()) as {
        id?: string;
        access?: ProjectAccessLevel;
        error?: string;
      };
      if (!saveResponse.ok || !saveResult.id) {
        throw new Error(
          saveResult.error ?? "AI가 수정한 문서를 저장하지 못했습니다.",
        );
      }
      const historyProjectId = saveResult.id;
      setProjectId(saveResult.id);
      if (saveResult.access) setProjectAccess(saveResult.access);

      const historyResponse = await fetch(
        `/api/projects/${encodeURIComponent(historyProjectId)}/ai-prompt-chats`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: requestPrompt,
            model: result.model ?? requestedModel,
            screenTitle: nextDocument.title,
          }),
        },
      );
      const historyResult = (await historyResponse.json()) as {
        saved?: boolean;
        error?: string;
      };
      if (!historyResponse.ok || !historyResult.saved) {
        throw new Error(
          historyResult.error ?? "AI 프롬프트 내역을 저장하지 못했습니다.",
        );
      }

      setPrompt("");
      setAiHistoryVersion((current) => current + 1);
      setSaved(
        `${result.model ?? requestedModel} 화면 생성됨 · 프롬프트 기록 저장됨`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI 화면 생성에 실패했습니다.";
      setSaved(message);
      setErrorSnackbar({ id: Date.now(), message });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="app-shell">
      <EditorHeader
        saved={saved}
        canUndo={projectAccess !== "view" && historyStatus.undo > 0}
        canRedo={projectAccess !== "view" && historyStatus.redo > 0}
        onUndo={undo}
        onRedo={redo}
        onPreview={openPreview}
        projectId={projectId}
        access={projectAccess}
      />
      <section className="workspace">
        <LeftPanel
          title={documentTitle}
          onRenameTitle={(name) => {
            if (projectAccess === "view") return;
            setDocumentTitle(name);
            setSaved("문서 제목 수정됨");
          }}
          layers={layers}
          selectedIds={selectedIds}
          selectionAnchor={selectionAnchor}
          onSelect={selectLayer}
          onMoveToParent={(...args) => {
            if (projectAccess !== "view") moveLayersToParent(...args);
          }}
          onRename={(...args) => {
            if (projectAccess !== "view") renameLayer(...args);
          }}
          onAdd={(parentId, kind) => {
            if (projectAccess !== "view") addLayer(parentId, kind);
          }}
          onDelete={(id) => {
            if (projectAccess !== "view") deleteLayer(id);
          }}
          onToggleVisibility={(id) => {
            if (projectAccess !== "view") toggleVisibility(id);
          }}
          onToggleLock={(id) => {
            if (projectAccess !== "view") toggleLock(id);
          }}
          onNewPage={() => {
            if (projectAccess !== "view") addPage();
          }}
          onSave={() =>
            setReviewDialog({ action: "save", loading: false, error: "" })
          }
          onDeletePage={() => {
            if (projectAccess !== "view") deleteSelectedPage();
          }}
          onOpenProject={openProject}
          canDeletePage={
            projectAccess !== "view" &&
            selectedLayer?.kind === "page" &&
            layers.filter((item) => item.kind === "page").length > 1
          }
          saving={saving}
          prompt={prompt}
          onPromptChange={(value) => {
            if (projectAccess !== "view") setPrompt(value);
          }}
          models={models}
          model={model}
          onModelChange={setModel}
          modelsLoading={modelsLoading}
          modelWarning={modelWarning}
          projectId={projectId}
          aiHistoryVersion={aiHistoryVersion}
          onGenerate={generate}
          generating={generating}
          readOnly={projectAccess === "view"}
          projectStatus={projectStatus}
          isReviewer={isReviewer && projectStatus === "review"}
          canManageReview={projectAccess === "owner"}
          onReviewAction={(action) =>
            setReviewDialog({ action, loading: false, error: "" })
          }
        />
        <CanvasEditor
          projectId={projectId}
          focusRequestKey={focusRequestKey}
          focusPageId={focusPageId}
          layers={layers}
          sizes={sizes}
          positions={positions}
          layerText={layerText}
          layerImages={layerImages}
          layerStyles={layerStyles}
          onDelete={(id) => {
            if (projectAccess !== "view") deleteLayer(id);
          }}
          onAdd={(...args) => {
            if (projectAccess !== "view") addLayer(...args);
          }}
          onReorder={(...args) => {
            if (projectAccess !== "view") reorderLayer(...args);
          }}
          onResize={(id, size) => {
            if (projectAccess === "view") return;
            setSizes((current) => ({ ...current, [id]: size }));
            setSaved("크기 수정됨");
          }}
          onMove={(id, position) => {
            if (projectAccess === "view") return;
            setPositions((current) => ({ ...current, [id]: position }));
            setSaved("위치 수정됨");
          }}
          selected={selected}
          onSelect={selectLayer}
          readOnly={projectAccess === "view"}
        />
        <RightPanel
          selectedName={selectedName}
          selectedLayer={selectedLayer}
          layerText={layerText[selected] ?? selectedName}
          imageSrc={layerImages[selected]}
          layerStyle={layerStyles[selected] ?? {}}
          size={sizes[selected]}
          position={positions[selected]}
          onLayerText={(value) => {
            if (projectAccess === "view") return;
            setLayerText((current) => ({ ...current, [selected]: value }));
            setSaved("텍스트 수정됨");
          }}
          onImage={(value) => {
            if (projectAccess === "view") return;
            setLayerImages((current) => ({ ...current, [selected]: value }));
            setSaved("이미지 변경됨");
          }}
          onSize={(size) => {
            if (projectAccess === "view") return;
            setSizes((current) => ({ ...current, [selected]: size }));
            setSaved("크기 수정됨");
          }}
          onPosition={(position) => {
            if (projectAccess === "view") return;
            setPositions((current) => ({ ...current, [selected]: position }));
            setSaved("위치 수정됨");
          }}
          onLayerStyle={(style) => {
            if (projectAccess === "view") return;
            setLayerStyles((current) => ({
              ...current,
              [selected]: { ...current[selected], ...style },
            }));
            setSaved("스타일 수정됨");
          }}
          onIconProperties={(properties) => {
            if (projectAccess === "view") return;
            updateLayerState(selected, (layer) => ({
              ...layer,
              ...properties,
            }));
            setSaved("아이콘 속성 수정됨");
          }}
          onOptionProperties={(properties) => {
            if (projectAccess === "view") return;
            updateLayerState(selected, (layer) => ({
              ...layer,
              ...properties,
            }));
            setSaved("선택 옵션 속성 수정됨");
          }}
          readOnly={projectAccess === "view"}
        />
      </section>
      {reviewDialog && (
        <ReviewDialog
          open
          action={reviewDialog.action}
          loading={reviewDialog.loading}
          error={reviewDialog.error}
          onClose={() => setReviewDialog(null)}
          onSubmit={submitReviewAction}
        />
      )}
      {errorSnackbar && (
        <div
          key={errorSnackbar.id}
          className="error-snackbar"
          role="alert"
          aria-live="assertive"
        >
          <span className="error-snackbar-icon" aria-hidden>
            !
          </span>
          <div className="error-snackbar-content">
            <strong>오류가 발생했습니다</strong>
            <p>{errorSnackbar.message}</p>
          </div>
          <button
            type="button"
            aria-label="오류 메시지 닫기"
            onClick={() => setErrorSnackbar(null)}
          >
            ×
          </button>
        </div>
      )}
    </main>
  );
}
