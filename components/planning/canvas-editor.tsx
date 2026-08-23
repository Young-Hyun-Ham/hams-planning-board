import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { muiIcons } from "../icons/mui";
import { svgIcons } from "../icons/svg";
import { Icon } from "./icon";
import type {
  Device,
  Layer,
  LayerPosition,
  LayerSize,
  LayerStyle,
} from "./types";

function flatten(items: Layer[]): Layer[] {
  return items.flatMap((item) => [
    item,
    ...(item.children ? flatten(item.children) : []),
  ]);
}

type CanvasMemo = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
  opacity: number;
  createdAt: string | null;
  updatedAt: string | null;
};

function ElementIcon({ layer }: { layer: Layer }) {
  const registry = layer.iconType === "svg" ? svgIcons : muiIcons;
  const IconComponent = registry[
    layer.iconInstance as keyof typeof registry
  ] as React.ComponentType<{ size?: number; color?: string }> | undefined;

  return IconComponent ? (
    <IconComponent
      size={layer.iconSize ?? 22}
      color={layer.iconColor ?? "currentColor"}
    />
  ) : (
    <span style={{ color: layer.iconColor ?? "currentColor" }}>
      <Icon name="icon" size={layer.iconSize ?? 22} />
    </span>
  );
}
const zoomSteps = Array.from({ length: 30 }, (_, index) => (index + 1) * 10);

export function CanvasEditor({
  layers,
  sizes,
  positions,
  layerText,
  layerImages,
  layerStyles,
  onResize,
  onMove,
  onReorder,
  onDelete,
  onAdd,
  projectId,
  focusRequestKey,
  focusPageId,
  selected,
  onSelect,
  readOnly,
}: {
  layers: Layer[];
  sizes: Record<string, LayerSize>;
  positions: Record<string, LayerPosition>;
  layerText: Record<string, string>;
  layerImages: Record<string, string>;
  layerStyles: Record<string, LayerStyle>;
  onResize: (id: string, size: LayerSize) => void;
  onMove: (id: string, position: LayerPosition) => void;
  onReorder: (
    id: string,
    action: "front" | "forward" | "backward" | "back",
  ) => void;
  onDelete: (id: string) => void;
  onAdd: (parentId: string, kind: Layer["kind"]) => void;
  projectId?: string;
  focusRequestKey: number;
  focusPageId: string;
  selected: string;
  onSelect: (id: string) => void;
  readOnly: boolean;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [tool, setTool] = useState<"cursor" | "hand">("cursor"),
    [panning, setPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [box, setBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [orderMenu, setOrderMenu] = useState<{
    x: number;
    y: number;
    submenuSide: "left" | "right";
  } | null>(null);
  const [zoom, setZoom] = useState<number>(100),
    [zoomMenu, setZoomMenu] = useState(false);
  const [commentPanel, setCommentPanel] = useState<"write" | "list" | null>(
    null,
  );
  const [commentText, setCommentText] = useState(""),
    [commentSaving, setCommentSaving] = useState(false),
    [commentLoading, setCommentLoading] = useState(false),
    [commentError, setCommentError] = useState("");
  const [comments, setComments] = useState<
    { id: string; text: string; author: string; createdAt: string | null }[]
  >([]);
  const [memos, setMemos] = useState<CanvasMemo[]>([]);
  const [memoCreating, setMemoCreating] = useState(false);
  const artboardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const suppressCanvasClickRef = useRef(false);
  useEffect(() => {
    if (!commentPanel) return;
    const close = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest(".comment-control")
      )
        return;
      setCommentPanel(null);
    };
    window.addEventListener("pointerdown", close, true);
    return () => window.removeEventListener("pointerdown", close, true);
  }, [commentPanel]);
  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    fetch(`/api/projects/${encodeURIComponent(projectId)}/memos`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          memos?: CanvasMemo[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(result.error ?? "메모 목록을 불러오지 못했습니다.");
        }
        setMemos(result.memos ?? []);
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          window.alert(error.message);
        }
      });
    return () => controller.abort();
  }, [projectId]);
  const select = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    if (tool === "cursor") onSelect(id);
  };
  const openOrderMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOrderMenu({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 194)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 350)),
      submenuSide:
        event.clientX + 178 + 230 + 16 > window.innerWidth ? "left" : "right",
    });
  };
  const orderMap = new Map(
    flatten(layers).map((item, index) => [item.id, index + 1]),
  );
  const styleFor = (id: string): React.CSSProperties => {
    const layerStyle = layerStyles[id] ?? {};
    const effectStyle: React.CSSProperties =
      layerStyle.effect === "shadow"
        ? { boxShadow: "0 8px 20px rgb(0 0 0 / 25%)" }
        : layerStyle.effect === "soft-shadow"
          ? { boxShadow: "0 16px 40px rgb(0 0 0 / 14%)" }
          : layerStyle.effect === "blur"
            ? { filter: "blur(3px)" }
            : layerStyle.effect === "grayscale"
              ? { filter: "grayscale(1)" }
              : layerStyle.effect === "text-shadow"
                ? { textShadow: "0 3px 8px rgb(0 0 0 / 30%)" }
                : {};
    return {
      width: sizes[id]?.width,
      height: sizes[id]?.height,
      maxWidth: sizes[id] ? "none" : undefined,
      position: positions[id] ? "absolute" : undefined,
      left: positions[id]?.x,
      top: positions[id]?.y,
      transform: "none",
      zIndex: orderMap.get(id),
      fontSize: layerStyle.fontSize,
      lineHeight: layerStyle.lineHeight,
      fontWeight: layerStyle.fontWeight,
      color: layerStyle.color,
      backgroundColor: layerStyle.backgroundColor,
      borderColor: layerStyle.borderColor,
      borderStyle: layerStyle.borderWidth !== undefined ? "solid" : undefined,
      borderWidth: layerStyle.borderWidth,
      opacity: layerStyle.opacity,
      borderRadius: layerStyle.borderRadius,
      textAlign: layerStyle.textAlign,
      ...effectStyle,
    };
  };
  const selectedLayer = flatten(layers).find((item) => item.id === selected);
  const canAddToSelected =
    selectedLayer?.kind === "page" ||
    selectedLayer?.kind === "section" ||
    selectedLayer?.kind === "layer";
  const additions: { kind: Layer["kind"]; label: string }[] = [
    { kind: "layer", label: "Layer" },
    { kind: "section", label: "Section" },
    { kind: "text", label: "Text" },
    { kind: "image", label: "Image" },
    { kind: "clipboard", label: "Clipboard" },
    { kind: "button", label: "Button" },
    { kind: "checkbox", label: "Checkbox" },
    { kind: "radio", label: "Radio" },
    { kind: "select", label: "Select" },
    { kind: "icon", label: "Icon" },
  ];
  const pages = layers.filter(
    (item) => item.kind === "page" && item.visible !== false,
  );
  const defaultPageWidth =
    device === "desktop" ? 860 : device === "tablet" ? 650 : 390;
  const pagePosition = (page: Layer, index: number): LayerPosition =>
    positions[page.id] ?? { x: index * (defaultPageWidth + 80), y: 0 };
  const workspaceWidth = Math.max(
    defaultPageWidth,
    ...pages.map((page, index) =>
      Math.max(
        0,
        pagePosition(page, index).x +
          (sizes[page.id]?.width ?? defaultPageWidth),
      ),
    ),
    ...memos.map((memo) => Math.max(0, memo.x + memo.width)),
  );
  const workspaceHeight = Math.max(
    560,
    ...pages.map((page, index) =>
      Math.max(
        0,
        pagePosition(page, index).y + (sizes[page.id]?.height ?? 560),
      ),
    ),
    ...memos.map((memo) => Math.max(0, memo.y + memo.height)),
  );
  const findLayer = (items: Layer[], id: string): Layer | undefined => {
    for (const item of items) {
      if (item.id === id) return item;
      const found = item.children && findLayer(item.children, id);
      if (found) return found;
    }
  };
  const renderPaletteLayer = (layer: Layer): React.ReactNode => {
    if (layer.visible === false) return null;
    const container = layer.kind === "section" || layer.kind === "layer";
    return (
      <div
        key={layer.id}
        data-layer-id={layer.id}
        style={{
          ...styleFor(layer.id),
          ...(layerImages[layer.id]
            ? {
                backgroundImage: `url(${layerImages[layer.id]})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}),
        }}
        className={`custom-canvas-layer ${layer.kind} ${selected === layer.id ? "canvas-node-selected" : ""}`}
        data-layer-label={layer.name}
        onClick={(event) => select(event, layer.id)}
      >
        {container ? (
          selected === layer.id ? (
            <span className="custom-container-label">{layer.name}</span>
          ) : null
        ) : (
          <span
            className="custom-layer-content"
            style={
              layer.kind === "text" || layer.kind === "button"
                ? { width: "100%", textAlign: layerStyles[layer.id]?.textAlign }
                : undefined
            }
          >
            {layerImages[layer.id] ? null : layer.kind === "image" ||
              layer.kind === "clipboard" ? (
              <>
                <Icon name={layer.kind} size={22} />
                <small>
                  {layer.kind === "clipboard" ? "Ctrl+V" : "이미지"}
                </small>
              </>
            ) : layer.kind === "checkbox" || layer.kind === "radio" ? (
              <span
                className={`canvas-option-list ${layer.optionOrientation ?? "horizontal"}`}
              >
                {Array.from(
                  { length: Math.max(1, layer.optionCount ?? 1) },
                  (_, index) => {
                    const option = layer.optionItems?.[index] ?? {
                      display: `${layer.optionLabel ?? "Option"} ${index + 1}`,
                      value: "Option",
                    };
                    return (
                      <label key={index} className="canvas-option-item">
                        <input
                          type={layer.kind}
                          name={layer.kind === "radio" ? layer.id : undefined}
                          value={option.value}
                          onClick={(event) => event.preventDefault()}
                        />
                        <span>{option.display}</span>
                      </label>
                    );
                  },
                )}
              </span>
            ) : layer.kind === "select" ? (
              <select aria-label={layer.name} defaultValue="option">
                <option value="option">Option</option>
              </select>
            ) : layer.kind === "icon" ? (
              <ElementIcon layer={layer} />
            ) : layer.kind === "text" || layer.kind === "button" ? (
              (layerText[layer.id] ?? layer.name)
            ) : (
              layer.name
            )}
          </span>
        )}
        {container && layer.children?.length ? (
          <div className="custom-layer-children">
            {layer.children.map(renderPaletteLayer)}
          </div>
        ) : null}
      </div>
    );
  };
  const renderCustomChildren = (parentId: string) => {
    const parent = findLayer(layers, parentId);
    return parent?.visible === false
      ? null
      : parent?.children
          ?.filter((item) => !item.template)
          .map(renderPaletteLayer);
  };

  useEffect(() => {
    const close = (event?: Event) => {
      if (
        event?.target instanceof Element &&
        event.target.closest(".canvas-context-menu")
      )
        return;
      setOrderMenu(null);
    };
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("contextmenu", close, true);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", close, true);
      window.removeEventListener("contextmenu", close, true);
      window.removeEventListener("blur", close);
    };
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      setZoom((current) => {
        const index = zoomSteps.indexOf(current);
        const nextIndex = Math.max(
          0,
          Math.min(zoomSteps.length - 1, index + (event.deltaY < 0 ? 1 : -1)),
        );
        return zoomSteps[nextIndex];
      });
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, []);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest(".zoom-control")
      )
        return;
      setZoomMenu(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);

  useLayoutEffect(() => {
    const board = artboardRef.current,
      node = board?.querySelector<HTMLElement>(
        `[data-layer-id="${CSS.escape(selected)}"]`,
      );
    if (!board || !node || selected === "hero") {
      setBox(null);
      return;
    }
    const measure = () => {
      const boardRect = board.getBoundingClientRect(),
        rect = node.getBoundingClientRect();
      const scale = boardRect.width / board.offsetWidth || 1;
      const nextBox = {
        left: (rect.left - boardRect.left) / scale,
        top: (rect.top - boardRect.top) / scale,
        width: rect.width / scale,
        height: rect.height / scale,
      };
      setBox((current) =>
        current &&
        Math.abs(current.left - nextBox.left) < 0.01 &&
        Math.abs(current.top - nextBox.top) < 0.01 &&
        Math.abs(current.width - nextBox.width) < 0.01 &&
        Math.abs(current.height - nextBox.height) < 0.01
          ? current
          : nextBox,
      );
    };
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(node);
    node.addEventListener("transitionend", measure);
    return () => {
      resizeObserver.disconnect();
      node.removeEventListener("transitionend", measure);
    };
  }, [selected, sizes, positions, device, layers, zoom]);

  useEffect(() => {
    if (focusRequestKey === 0) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      setPanOffset({ x: 0, y: 0 });
      secondFrame = requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        const node = artboardRef.current?.querySelector<HTMLElement>(
          `[data-layer-id="${CSS.escape(focusPageId)}"]`,
        );
        if (!canvas || !node) return;
        const canvasRect = canvas.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();
        canvas.scrollTo({
          left:
            canvas.scrollLeft +
            nodeRect.left -
            canvasRect.left -
            (canvas.clientWidth - nodeRect.width) / 2,
          top:
            canvas.scrollTop +
            nodeRect.top -
            canvasRect.top -
            (canvas.clientHeight - nodeRect.height) / 2,
          behavior: "smooth",
        });
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [focusPageId, focusRequestKey]);

  const beginResize = (
    event: React.PointerEvent,
    corner: "nw" | "ne" | "sw" | "se",
  ) => {
    if (event.button !== 0 || !box || selectedLayer?.locked) return;
    event.preventDefault();
    event.stopPropagation();
    const scale =
      (artboardRef.current?.getBoundingClientRect().width ?? 1) /
        (artboardRef.current?.offsetWidth ?? 1) || 1;
    const node = artboardRef.current?.querySelector<HTMLElement>(
      `[data-layer-id="${CSS.escape(selected)}"]`,
    );
    if (!node) return;
    const parent =
      (node.offsetParent as HTMLElement | null) ?? artboardRef.current;
    if (!parent) return;
    const start = {
      x: event.clientX,
      y: event.clientY,
      width: box.width,
      height: box.height,
      position: positions[selected] ?? {
        x: node.offsetLeft,
        y: node.offsetTop,
      },
    };
    let frame: number | null = null,
      lastEvent: PointerEvent | null = null;
    const update = () => {
      frame = null;
      if (!lastEvent) return;
      suppressCanvasClickRef.current = true;
      const dx = (lastEvent.clientX - start.x) / scale,
        dy = (lastEvent.clientY - start.y) / scale,
        west = corner.includes("w"),
        north = corner.includes("n");
      const unbounded = selectedLayer?.kind === "page";
      const maxWidth = Math.max(
          1,
          unbounded
            ? Number.POSITIVE_INFINITY
            : west
              ? start.position.x + start.width
              : parent.clientWidth - start.position.x,
        ),
        maxHeight = Math.max(
          1,
          unbounded
            ? Number.POSITIVE_INFINITY
            : north
              ? start.position.y + start.height
              : parent.clientHeight - start.position.y,
        ),
        minWidth = Math.min(24, maxWidth),
        minHeight = Math.min(18, maxHeight);
      const width = Math.max(
          minWidth,
          Math.min(maxWidth, start.width + (west ? -dx : dx)),
        ),
        height = Math.max(
          minHeight,
          Math.min(maxHeight, start.height + (north ? -dy : dy)),
        );
      onResize(selected, { width, height });
      onMove(selected, {
        x: Math.max(0, start.position.x + (west ? start.width - width : 0)),
        y: Math.max(0, start.position.y + (north ? start.height - height : 0)),
      });
    };
    const move = (moveEvent: PointerEvent) => {
      lastEvent = moveEvent;
      if (frame === null) frame = requestAnimationFrame(update);
    };
    const end = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        update();
      }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      setTimeout(() => {
        suppressCanvasClickRef.current = false;
      }, 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  const beginMove = (event: React.PointerEvent) => {
    if (
      event.button !== 0 ||
      !box ||
      selectedLayer?.locked ||
      (event.target as HTMLElement).classList.contains("resize-handle")
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const scale =
      (artboardRef.current?.getBoundingClientRect().width ?? 1) /
        (artboardRef.current?.offsetWidth ?? 1) || 1;
    const node = artboardRef.current?.querySelector<HTMLElement>(
        `[data-layer-id="${CSS.escape(selected)}"]`,
      ),
      parent =
        (node?.offsetParent as HTMLElement | null) ?? artboardRef.current;
    if (!node || !parent) return;
    const start = {
        x: event.clientX,
        y: event.clientY,
        position: positions[selected] ?? {
          x: node.offsetLeft,
          y: node.offsetTop,
        },
      },
      maxX =
        selectedLayer?.kind === "page"
          ? Number.POSITIVE_INFINITY
          : Math.max(0, parent.clientWidth - node.offsetWidth),
      maxY =
        selectedLayer?.kind === "page"
          ? Number.POSITIVE_INFINITY
          : Math.max(0, parent.clientHeight - node.offsetHeight);
    let frame: number | null = null,
      lastEvent: PointerEvent | null = null;
    const update = () => {
      frame = null;
      if (!lastEvent) return;
      suppressCanvasClickRef.current = true;
      const x = Math.max(
          0,
          Math.min(
            maxX,
            start.position.x + (lastEvent.clientX - start.x) / scale,
          ),
        ),
        y = Math.max(
          0,
          Math.min(
            maxY,
            start.position.y + (lastEvent.clientY - start.y) / scale,
          ),
        );
      onMove(selected, { x, y });
    };
    const move = (moveEvent: PointerEvent) => {
      lastEvent = moveEvent;
      if (frame === null) frame = requestAnimationFrame(update);
    };
    const end = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        update();
      }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      setTimeout(() => {
        suppressCanvasClickRef.current = false;
      }, 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  const beginPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (tool !== "hand") return;
    if (event.target instanceof Element && event.target.closest(".canvas-memo"))
      return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.preventDefault();
    event.stopPropagation();
    suppressCanvasClickRef.current = true;
    setPanning(true);
    const start = { x: event.clientX, y: event.clientY, offset: panOffset };
    const move = (moveEvent: PointerEvent) => {
      setPanOffset({
        x: start.offset.x + moveEvent.clientX - start.x,
        y: start.offset.y + moveEvent.clientY - start.y,
      });
    };
    const end = () => {
      setPanning(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      setTimeout(() => {
        suppressCanvasClickRef.current = false;
      }, 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  const loadComments = async () => {
    if (!projectId) {
      setCommentError("먼저 문서를 저장해주세요.");
      return;
    }
    setCommentLoading(true);
    setCommentError("");
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/comments`,
      );
      const result = (await response.json()) as {
        comments?: typeof comments;
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? "코멘트를 불러오지 못했습니다.");
      setComments(result.comments ?? []);
    } catch (error) {
      setCommentError(
        error instanceof Error
          ? error.message
          : "코멘트를 불러오지 못했습니다.",
      );
    } finally {
      setCommentLoading(false);
    }
  };
  const saveComment = async () => {
    if (readOnly) {
      setCommentError("보기 전용 문서에는 코멘트를 작성할 수 없습니다.");
      return;
    }
    if (!projectId) {
      setCommentError("먼저 문서를 저장해주세요.");
      return;
    }
    if (!commentText.trim()) return;
    setCommentSaving(true);
    setCommentError("");
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: commentText }),
        },
      );
      const result = (await response.json()) as {
        saved?: boolean;
        error?: string;
      };
      if (!response.ok || !result.saved)
        throw new Error(result.error ?? "코멘트를 저장하지 못했습니다.");
      setCommentText("");
      setCommentPanel("list");
      await loadComments();
    } catch (error) {
      setCommentError(
        error instanceof Error
          ? error.message
          : "코멘트를 저장하지 못했습니다.",
      );
    } finally {
      setCommentSaving(false);
    }
  };
  const updateMemoLocal = (id: string, update: Partial<CanvasMemo>) => {
    setMemos((current) =>
      current.map((memo) => (memo.id === id ? { ...memo, ...update } : memo)),
    );
  };
  const saveMemo = async (id: string, update: Partial<CanvasMemo>) => {
    if (readOnly) return;
    if (!projectId) return;
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/memos`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...update }),
        },
      );
      const result = (await response.json()) as {
        saved?: boolean;
        error?: string;
      };
      if (!response.ok || !result.saved) {
        throw new Error(result.error ?? "메모를 저장하지 못했습니다.");
      }
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "메모를 저장하지 못했습니다.",
      );
    }
  };
  const addMemo = async () => {
    if (readOnly) return;
    if (!projectId) {
      window.alert("메모를 추가하려면 먼저 문서를 저장해주세요.");
      return;
    }
    const containsSelected = (layer: Layer): boolean =>
      layer.id === selected || Boolean(layer.children?.some(containsSelected));
    const page = pages.find(containsSelected) ?? pages[0];
    const pageIndex = page ? pages.indexOf(page) : 0;
    const origin = page ? pagePosition(page, pageIndex) : { x: 0, y: 0 };
    const offset = (memos.length % 6) * 18;
    const draft = {
      x: origin.x + 40 + offset,
      y: origin.y + 40 + offset,
      width: 220,
      height: 160,
    };
    setMemoCreating(true);
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/memos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      const result = (await response.json()) as {
        memo?: CanvasMemo;
        error?: string;
      };
      if (!response.ok || !result.memo) {
        throw new Error(result.error ?? "메모를 추가하지 못했습니다.");
      }
      setMemos((current) => [...current, result.memo as CanvasMemo]);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "메모를 추가하지 못했습니다.",
      );
    } finally {
      setMemoCreating(false);
    }
  };
  const beginMemoDrag = (
    event: React.PointerEvent<HTMLElement>,
    memo: CanvasMemo,
  ) => {
    if (readOnly) return;
    if (
      event.button !== 0 ||
      (event.target instanceof Element &&
        event.target.closest(".canvas-memo-controls"))
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const scale = zoom / 100;
    const startX = event.clientX;
    const startY = event.clientY;
    let nextX = memo.x;
    let nextY = memo.y;
    const move = (moveEvent: PointerEvent) => {
      nextX = memo.x + (moveEvent.clientX - startX) / scale;
      nextY = memo.y + (moveEvent.clientY - startY) / scale;
      updateMemoLocal(memo.id, { x: nextX, y: nextY });
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      void saveMemo(memo.id, { x: nextX, y: nextY });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };
  const beginMemoResize = (
    event: React.PointerEvent<HTMLButtonElement>,
    memo: CanvasMemo,
  ) => {
    if (readOnly) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const scale = zoom / 100;
    const startX = event.clientX;
    const startY = event.clientY;
    let nextWidth = memo.width;
    let nextHeight = memo.height;
    const move = (moveEvent: PointerEvent) => {
      nextWidth = Math.min(
        600,
        Math.max(140, memo.width + (moveEvent.clientX - startX) / scale),
      );
      nextHeight = Math.min(
        600,
        Math.max(100, memo.height + (moveEvent.clientY - startY) / scale),
      );
      updateMemoLocal(memo.id, { width: nextWidth, height: nextHeight });
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      void saveMemo(memo.id, { width: nextWidth, height: nextHeight });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };
  const deleteMemo = async (memo: CanvasMemo) => {
    if (readOnly) return;
    if (!projectId) return;
    if (!window.confirm("이 메모를 삭제하시겠습니까?")) return;
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/memos?memoId=${encodeURIComponent(memo.id)}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as {
        deleted?: boolean;
        error?: string;
      };
      if (!response.ok || !result.deleted) {
        throw new Error(result.error ?? "메모를 삭제하지 못했습니다.");
      }
      setMemos((current) => current.filter((item) => item.id !== memo.id));
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "메모를 삭제하지 못했습니다.",
      );
    }
  };

  return (
    <section className="canvas-area">
      <div className="canvas-toolbar">
        <div className="tool-group">
          <button
            className={tool === "cursor" ? "active" : ""}
            onClick={() => setTool("cursor")}
            title="선택 도구"
          >
            <Icon name="cursor" />
          </button>
          <button
            className={tool === "hand" ? "active" : ""}
            onClick={() => setTool("hand")}
            title="핸드 도구"
          >
            <Icon name="hand" />
          </button>
          <span />
          <div className="comment-control">
            <button
              className={commentPanel === "write" ? "active" : ""}
              disabled={readOnly}
              onClick={() => {
                setCommentError("");
                setCommentPanel((current) =>
                  current === "write" ? null : "write",
                );
              }}
              title="코멘트 작성"
            >
              <Icon name="comment" />
            </button>
            {commentPanel === "write" && (
              <div className="comment-popover">
                <strong>코멘트 남기기</strong>
                <textarea
                  maxLength={1000}
                  value={commentText}
                  disabled={readOnly}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="공유할 코멘트를 입력하세요."
                  autoFocus
                />
                <div className="comment-popover-footer">
                  <span>{commentText.length}/1000</span>
                  <button
                    onClick={saveComment}
                    disabled={readOnly || commentSaving || !commentText.trim()}
                  >
                    {commentSaving ? "저장 중..." : "저장"}
                  </button>
                </div>
                {commentError && <p>{commentError}</p>}
              </div>
            )}
          </div>
          <div className="comment-control">
            <button
              className={commentPanel === "list" ? "active" : ""}
              onClick={() => {
                const opening = commentPanel !== "list";
                setCommentPanel(opening ? "list" : null);
                if (opening) void loadComments();
              }}
              title="코멘트 목록"
            >
              <Icon name="comment" />
              <span className="comment-list-mark">≡</span>
            </button>
            {commentPanel === "list" && (
              <div className="comment-popover comment-list-popover">
                <strong>코멘트 목록</strong>
                {commentLoading ? (
                  <div className="comment-state">불러오는 중...</div>
                ) : commentError ? (
                  <div className="comment-state error">{commentError}</div>
                ) : comments.length === 0 ? (
                  <div className="comment-state">등록된 코멘트가 없습니다.</div>
                ) : (
                  <div className="comment-items">
                    {comments.map((comment) => (
                      <article key={comment.id}>
                        <div>
                          <b>{comment.author}</b>
                          <time>
                            {comment.createdAt
                              ? new Date(comment.createdAt).toLocaleString(
                                  "ko-KR",
                                )
                              : "방금 전"}
                          </time>
                        </div>
                        <p>{comment.text}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => void addMemo()}
            disabled={readOnly || memoCreating}
            title="메모 추가"
            aria-label="캔버스에 메모 추가"
          >
            <Icon name="note" />
          </button>
        </div>
        <div className="device-switch">
          {(["desktop", "tablet", "mobile"] as const).map((item) => (
            <button
              key={item}
              className={device === item ? "active" : ""}
              onClick={() => setDevice(item)}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <div className="zoom-control">
          <button className="zoom" onClick={() => setZoomMenu((open) => !open)}>
            {zoom}% <Icon name="down" size={11} />
          </button>
          {zoomMenu && (
            <div className="zoom-menu">
              {zoomSteps.map((value) => (
                <button
                  key={value}
                  className={zoom === value ? "active" : ""}
                  onClick={() => {
                    setZoom(value);
                    setZoomMenu(false);
                  }}
                >
                  {value}%
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div
        ref={canvasRef}
        className={`canvas ${tool === "hand" ? "hand-tool" : ""} ${panning ? "panning" : ""}`}
        onPointerDownCapture={beginPan}
        onClickCapture={(event) => {
          if (tool === "hand") {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onDoubleClickCapture={(event) => {
          if (tool === "hand") {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <div
          className="artboard-zoom-stage"
          style={{
            width: (workspaceWidth * zoom) / 100,
            height: (workspaceHeight * zoom) / 100,
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}
        >
          <div
            ref={artboardRef}
            className="canvas-workspace"
            style={{
              width: workspaceWidth,
              height: workspaceHeight,
              transform: `scale(${zoom / 100})`,
            }}
          >
            {pages.map((page, pageIndex) => (
              <div
                key={page.id}
                style={{
                  ...styleFor(page.id),
                  left: pagePosition(page, pageIndex).x,
                  top: pagePosition(page, pageIndex).y,
                  width: sizes[page.id]?.width,
                  height: sizes[page.id]?.height,
                }}
                className={`artboard ${device} ${selected === page.id ? "canvas-node-selected page-selected" : ""}`}
                data-layer-id={page.id}
                data-layer-label={selected === page.id ? page.name : undefined}
                onContextMenu={openOrderMenu}
                onClick={(event) => {
                  if (!suppressCanvasClickRef.current && page)
                    select(event, page.id);
                }}
              >
                <div className="custom-layer-stack">
                  {renderCustomChildren(page.id)}
                </div>
              </div>
            ))}
            {memos.map((memo, index) => (
              <article
                key={memo.id}
                className="canvas-memo"
                style={{
                  left: memo.x,
                  top: memo.y,
                  width: memo.width,
                  height: memo.height,
                  backgroundColor: memo.backgroundColor,
                  opacity: memo.opacity,
                  zIndex: 10000 + index,
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <header onPointerDown={(event) => beginMemoDrag(event, memo)}>
                  <strong>메모</strong>
                  <div className="canvas-memo-controls">
                    <label title={`투명도 ${Math.round(memo.opacity * 100)}%`}>
                      <span>투명도</span>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={Math.round(memo.opacity * 100)}
                        disabled={readOnly}
                        onChange={(event) =>
                          updateMemoLocal(memo.id, {
                            opacity: Number(event.target.value) / 100,
                          })
                        }
                        onPointerUp={(event) =>
                          void saveMemo(memo.id, {
                            opacity: Number(event.currentTarget.value) / 100,
                          })
                        }
                        onBlur={(event) =>
                          void saveMemo(memo.id, {
                            opacity: Number(event.currentTarget.value) / 100,
                          })
                        }
                      />
                    </label>
                    <label className="canvas-memo-color" title="메모 배경색">
                      <span>배경색</span>
                      <input
                        type="color"
                        value={memo.backgroundColor}
                        disabled={readOnly}
                        onChange={(event) => {
                          const backgroundColor = event.target.value;
                          updateMemoLocal(memo.id, { backgroundColor });
                          void saveMemo(memo.id, { backgroundColor });
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={readOnly}
                      title="메모 닫기 및 삭제"
                      aria-label="메모 닫기 및 삭제"
                      onClick={() => void deleteMemo(memo)}
                    >
                      ×
                    </button>
                  </div>
                </header>
                <textarea
                  maxLength={4000}
                  value={memo.text}
                  readOnly={readOnly}
                  onChange={(event) =>
                    updateMemoLocal(memo.id, { text: event.target.value })
                  }
                  onBlur={(event) =>
                    void saveMemo(memo.id, { text: event.target.value })
                  }
                  placeholder="메모를 입력하세요"
                  aria-label="메모 내용"
                />
                <button
                  type="button"
                  disabled={readOnly}
                  className="canvas-memo-resize"
                  title="메모 크기 조절"
                  aria-label="메모 크기 조절"
                  onPointerDown={(event) => beginMemoResize(event, memo)}
                />
              </article>
            ))}
            {box && (
              <div
                className="resize-overlay"
                style={box}
                onPointerDown={beginMove}
                onContextMenu={openOrderMenu}
                onClick={(event) => event.stopPropagation()}
                title="드래그하여 이동"
              >
                {(["top", "right", "bottom", "left"] as const).map((edge) => (
                  <span
                    key={edge}
                    className={`move-edge ${edge}`}
                    onPointerDown={beginMove}
                  />
                ))}
                {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                  <button
                    key={corner}
                    className={`resize-handle ${corner}`}
                    onPointerDown={(event) => beginResize(event, corner)}
                    title="크기 조절"
                  />
                ))}
                <span className="size-badge">
                  {Math.round(box.width)} × {Math.round(box.height)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      {orderMenu &&
        createPortal(
          <div
            className={`canvas-context-menu submenu-${orderMenu.submenuSide}`}
            style={{ left: orderMenu.x, top: orderMenu.y }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {canAddToSelected && selectedLayer && (
              <>
                <div className="canvas-add-group">
                  <button className="canvas-add-trigger">
                    <span className="order-symbol">＋</span>
                    <span>{selectedLayer.name}에 추가</span>
                    <span className="submenu-arrow">▸</span>
                  </button>
                  <div className="canvas-add-submenu">
                    {additions.map((item) => (
                      <button
                        key={item.kind}
                        onClick={() => {
                          onAdd(selectedLayer.id, item.kind);
                          setOrderMenu(null);
                        }}
                      >
                        <Icon
                          name={
                            item.kind === "section"
                              ? "frame"
                              : item.kind === "layer"
                                ? "group"
                                : item.kind
                          }
                          size={14}
                        />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="order-menu-group">
              <button className="order-menu-trigger">
                <span className="order-symbol">▣</span>
                <span>순서</span>
                <span className="submenu-arrow">▸</span>
              </button>
              <div className="order-submenu">
                <button
                  onClick={() => {
                    onReorder(selected, "front");
                    setOrderMenu(null);
                  }}
                >
                  <span>맨 앞으로 가져오기</span>
                  <kbd>Ctrl+Shift+↑</kbd>
                </button>
                <button
                  onClick={() => {
                    onReorder(selected, "forward");
                    setOrderMenu(null);
                  }}
                >
                  <span>앞으로 가져오기</span>
                  <kbd>Ctrl+↑</kbd>
                </button>
                <button
                  onClick={() => {
                    onReorder(selected, "backward");
                    setOrderMenu(null);
                  }}
                >
                  <span>뒤로 보내기</span>
                  <kbd>Ctrl+↓</kbd>
                </button>
                <button
                  onClick={() => {
                    onReorder(selected, "back");
                    setOrderMenu(null);
                  }}
                >
                  <span>맨 뒤로 보내기</span>
                  <kbd>Ctrl+Shift+↓</kbd>
                </button>
              </div>
            </div>
            <div className="canvas-menu-separator" />
            <button
              className="canvas-delete-button"
              disabled={selectedLayer?.kind === "page" && pages.length <= 1}
              onClick={() => {
                onDelete(selected);
                setOrderMenu(null);
              }}
            >
              <span>×</span>
              <span>삭제</span>
            </button>
          </div>,
          document.body,
        )}
    </section>
  );
}
