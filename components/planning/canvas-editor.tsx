import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./icon";
import type {
  Device,
  EditableContent,
  Layer,
  LayerPosition,
  LayerSize,
  UpdateContent,
} from "./types";

function EditableText({
  id,
  selectId = id,
  field,
  value,
  selected,
  editing,
  className = "",
  onSelect,
  onEdit,
  onUpdate,
  multiline = false,
  as = "span",
  style,
}: {
  id: string;
  selectId?: string;
  field: keyof EditableContent;
  value: string;
  selected: boolean;
  editing: boolean;
  className?: string;
  onSelect: (event: React.MouseEvent, id: string) => void;
  onEdit: (id: string) => void;
  onUpdate: UpdateContent;
  multiline?: boolean;
  as?: "span" | "b" | "h1" | "p";
  style?: React.CSSProperties;
}) {
  const Tag = as,
    elementRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!editing) return;
    elementRef.current?.focus();
    const selection = window.getSelection(),
      range = document.createRange();
    if (selection && elementRef.current) {
      range.selectNodeContents(elementRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, [editing]);
  return (
    <Tag
      ref={elementRef as never}
      className={`${className} ${selected ? "canvas-node-selected" : ""} ${editing ? "text-editing" : ""}`}
      data-layer-id={selectId}
      data-layer-label={editing ? "텍스트 편집 중" : id}
      contentEditable={editing}
      suppressContentEditableWarning
      onClick={(event) => onSelect(event, selectId)}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onEdit(id);
      }}
      onBlur={(event) => {
        onUpdate(field, event.currentTarget.innerText);
        onEdit("");
      }}
      onKeyDown={(event) => {
        if (!multiline && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") event.currentTarget.blur();
      }}
      style={{ ...style, whiteSpace: multiline ? "pre-line" : undefined }}
    >
      {value}
    </Tag>
  );
}

function flatten(items: Layer[]): Layer[] {
  return items.flatMap((item) => [
    item,
    ...(item.children ? flatten(item.children) : []),
  ]);
}
const zoomSteps = [60, 70, 80, 90, 100, 125, 150, 200, 300] as const;

export function CanvasEditor({
  layers,
  sizes,
  positions,
  layerText,
  layerImages,
  onResize,
  onMove,
  onReorder,
  onDelete,
  selected,
  content,
  onSelect,
  onUpdate,
}: {
  layers: Layer[];
  sizes: Record<string, LayerSize>;
  positions: Record<string, LayerPosition>;
  layerText: Record<string, string>;
  layerImages: Record<string, string>;
  onResize: (id: string, size: LayerSize) => void;
  onMove: (id: string, position: LayerPosition) => void;
  onReorder: (
    id: string,
    action: "front" | "forward" | "backward" | "back",
  ) => void;
  onDelete: (id: string) => void;
  selected: string;
  content: EditableContent;
  onSelect: (id: string) => void;
  onUpdate: UpdateContent;
}) {
  const [device, setDevice] = useState<Device>("desktop"),
    [editing, setEditing] = useState("");
  const [tool, setTool] = useState<"cursor" | "hand">("cursor"),
    [panning, setPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [box, setBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [orderMenu, setOrderMenu] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [zoom, setZoom] = useState<number>(100),
    [zoomMenu, setZoomMenu] = useState(false);
  const artboardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const suppressCanvasClickRef = useRef(false);
  const select = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    if (tool === "cursor" && !editing) onSelect(id);
  };
  const orderMap = new Map(
    flatten(layers).map((item, index) => [item.id, index + 1]),
  );
  const styleFor = (id: string): React.CSSProperties => ({
    width: sizes[id]?.width,
    height: sizes[id]?.height,
    maxWidth: sizes[id] ? "none" : undefined,
    position: positions[id] ? "absolute" : undefined,
    left: positions[id]?.x,
    top: positions[id]?.y,
    transform: "none",
    zIndex: orderMap.get(id),
  });
  const selectedLayer = flatten(layers).find((item) => item.id === selected);
  const findParentPage = (
    items: Layer[],
    id: string,
    page?: Layer,
  ): Layer | undefined => {
    for (const item of items) {
      const currentPage = item.kind === "page" ? item : page;
      if (item.id === id) return currentPage;
      const found =
        item.children && findParentPage(item.children, id, currentPage);
      if (found) return found;
    }
  };
  const selectedPage = findParentPage(layers, selected);
  const activePage =
    selectedPage?.visible !== false
      ? selectedPage
      : layers.find((item) => item.kind === "page" && item.visible !== false);
  const artboardSelected =
    selectedLayer?.kind === "page" && selectedLayer.id === activePage?.id;
  const pageSelected = artboardSelected;
  const activeIds = new Set(flatten(layers).map((item) => item.id));
  const editableSelection: Record<string, string> = {
    logo: "logo",
    eyebrow: "eyebrow",
    heading: "heading",
    description: "description",
    cta: "cta-text",
  };
  const findLayer = (items: Layer[], id: string): Layer | undefined => {
    for (const item of items) {
      if (item.id === id) return item;
      const found = item.children && findLayer(item.children, id);
      if (found) return found;
    }
  };
  const renderCustomLayer = (layer: Layer): React.ReactNode => {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    // @ts-expect-error Removed after the generic renderer below replaces this legacy declaration.
    const container = layer.kind === "group" || layer.kind === "frame";
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
          <span className="custom-layer-content">
            {layerImages[layer.id] ? null : layer.kind === "image" ||
              layer.kind === "clipboard" ? (
              <>
                <Icon name={layer.kind} size={22} />
                <small>
                  {layer.kind === "clipboard" ? "Ctrl+V" : "이미지"}
                </small>
              </>
            ) : layer.kind === "text" || layer.kind === "button" ? (
              (layerText[layer.id] ?? layer.name)
            ) : (
              layer.name
            )}
          </span>
        )}
        {container && layer.children?.length ? (
          <div className="custom-layer-children">
            {layer.children.map(renderCustomLayer)}
          </div>
        ) : null}
      </div>
    );
  };
  /* eslint-enable @typescript-eslint/no-unused-vars */
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
          <span className="custom-layer-content">
            {layerImages[layer.id] ? null : layer.kind === "image" ||
              layer.kind === "clipboard" ? (
              <>
                <Icon name={layer.kind} size={22} />
                <small>
                  {layer.kind === "clipboard" ? "Ctrl+V" : "이미지"}
                </small>
              </>
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
      event.preventDefault();
      setZoom((current) => {
        const index = zoomSteps.indexOf(current as (typeof zoomSteps)[number]);
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
    const boardRect = board.getBoundingClientRect(),
      rect = node.getBoundingClientRect();
    const scale = boardRect.width / board.offsetWidth || 1;
    setBox({
      left: (rect.left - boardRect.left) / scale,
      top: (rect.top - boardRect.top) / scale,
      width: rect.width / scale,
      height: rect.height / scale,
    });
  }, [selected, sizes, positions, device, content, layers, zoom]);

  const beginResize = (
    event: React.PointerEvent,
    corner: "nw" | "ne" | "sw" | "se",
  ) => {
    if (!box || selectedLayer?.locked) return;
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
      const maxWidth = Math.max(
          1,
          west
            ? start.position.x + start.width
            : parent.clientWidth - start.position.x,
        ),
        maxHeight = Math.max(
          1,
          north
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
      maxX = Math.max(0, parent.clientWidth - node.offsetWidth),
      maxY = Math.max(0, parent.clientHeight - node.offsetHeight);
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
          <button>
            <Icon name="comment" />
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
            width:
              ((device === "desktop" ? 860 : device === "tablet" ? 650 : 390) *
                zoom) /
              100,
            height: (560 * zoom) / 100,
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}
        >
          <div
            ref={artboardRef}
            style={{ transform: `scale(${zoom / 100})` }}
            className={`artboard ${device} ${artboardSelected ? "canvas-node-selected" : ""} ${pageSelected ? "page-selected" : ""}`}
            data-layer-id={activePage?.id}
            data-layer-label={artboardSelected ? activePage?.name : undefined}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOrderMenu({
                x: Math.min(event.clientX, window.innerWidth - 190),
                y: Math.min(event.clientY, window.innerHeight - 190),
              });
            }}
            onClick={(event) => {
              if (
                event.target === event.currentTarget &&
                !suppressCanvasClickRef.current &&
                activePage
              )
                select(event, activePage.id);
            }}
          >
            {activeIds.has("nav") && (
              <nav
                style={styleFor("nav")}
                data-layer-id="nav"
                className={`portfolio-nav ${selected === "nav" ? "canvas-node-selected" : ""}`}
                data-layer-label="Navigation"
                onClick={(event) => select(event, "nav")}
              >
                {activeIds.has("logo") && (
                  <EditableText
                    id="logo"
                    field="logo"
                    value={content.logo}
                    selected={selected === "logo"}
                    editing={editing === "logo"}
                    onSelect={select}
                    onEdit={setEditing}
                    onUpdate={onUpdate}
                    as="b"
                    style={styleFor("logo")}
                  />
                )}
                {activeIds.has("menu") && (
                  <div
                    style={styleFor("menu")}
                    data-layer-id="menu"
                    className={
                      selected === "menu" ? "canvas-node-selected" : ""
                    }
                    data-layer-label="Menu Items"
                    onClick={(event) => select(event, "menu")}
                  >
                    <EditableText
                      id="menuAbout"
                      selectId="menu"
                      field="menuAbout"
                      value={content.menuAbout}
                      selected={false}
                      editing={editing === "menuAbout"}
                      onSelect={select}
                      onEdit={setEditing}
                      onUpdate={onUpdate}
                    />
                    <EditableText
                      id="menuProjects"
                      selectId="menu"
                      field="menuProjects"
                      value={content.menuProjects}
                      selected={false}
                      editing={editing === "menuProjects"}
                      onSelect={select}
                      onEdit={setEditing}
                      onUpdate={onUpdate}
                    />
                    <EditableText
                      id="menuContact"
                      selectId="menu"
                      field="menuContact"
                      value={content.menuContact}
                      selected={false}
                      editing={editing === "menuContact"}
                      onSelect={select}
                      onEdit={setEditing}
                      onUpdate={onUpdate}
                    />
                    {renderCustomChildren("menu")}
                  </div>
                )}
                {renderCustomChildren("nav")}
              </nav>
            )}
            <div className="hero-grid">
              {activeIds.has("intro") && (
                <div
                  style={styleFor("intro")}
                  data-layer-id="intro"
                  className={`hero-copy ${selected === "intro" ? "canvas-node-selected" : ""}`}
                  data-layer-label="Intro Content"
                  onClick={(event) => select(event, "intro")}
                >
                  {activeIds.has("eyebrow") && (
                    <EditableText
                      id="eyebrow"
                      field="eyebrow"
                      value={content.eyebrow}
                      selected={selected === "eyebrow"}
                      editing={editing === "eyebrow"}
                      className="role"
                      onSelect={select}
                      onEdit={setEditing}
                      onUpdate={onUpdate}
                      style={styleFor("eyebrow")}
                    />
                  )}{" "}
                  {activeIds.has("heading") && (
                    <EditableText
                      id="heading"
                      field="heading"
                      value={content.heading}
                      selected={selected === "heading"}
                      editing={editing === "heading"}
                      onSelect={select}
                      onEdit={setEditing}
                      onUpdate={onUpdate}
                      multiline
                      as="h1"
                      style={styleFor("heading")}
                    />
                  )}{" "}
                  {activeIds.has("description") && (
                    <EditableText
                      id="description"
                      field="description"
                      value={content.description}
                      selected={selected === "description"}
                      editing={editing === "description"}
                      onSelect={select}
                      onEdit={setEditing}
                      onUpdate={onUpdate}
                      multiline
                      as="p"
                      style={styleFor("description")}
                    />
                  )}{" "}
                  {activeIds.has("cta") && (
                    <button
                      style={styleFor("cta")}
                      data-layer-id="cta"
                      className={
                        selected === "cta" ? "canvas-node-selected" : ""
                      }
                      data-layer-label="CTA Button"
                      onClick={(event) => select(event, "cta")}
                    >
                      <EditableText
                        id="cta-text"
                        selectId="cta"
                        field="cta"
                        value={content.cta}
                        selected={false}
                        editing={editing === "cta-text"}
                        onSelect={select}
                        onEdit={setEditing}
                        onUpdate={onUpdate}
                      />{" "}
                      <span>→</span>
                    </button>
                  )}
                </div>
              )}{" "}
              {activeIds.has("portrait") && (
                <div
                  style={{
                    ...styleFor("portrait"),
                    ...(layerImages.portrait
                      ? {
                          backgroundImage: `url(${layerImages.portrait})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : {}),
                  }}
                  data-layer-id="portrait"
                  className={`portrait ${selected === "portrait" ? "canvas-node-selected" : ""}`}
                  data-layer-label="Profile Image"
                  onClick={(event) => select(event, "portrait")}
                >
                  {!layerImages.portrait && (
                    <div className="portrait-shape">
                      <div className="person-head" />
                      <div className="person-body" />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="custom-layer-stack">
              {activePage && renderCustomChildren(activePage.id)}
            </div>
            {box && (
              <div
                className="resize-overlay"
                style={box}
                onPointerDown={beginMove}
                onClick={(event) => event.stopPropagation()}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  if (editableSelection[selected])
                    setEditing(editableSelection[selected]);
                }}
                title="드래그하여 이동"
              >
                <button
                  className="resize-handle nw"
                  onPointerDown={(event) => beginResize(event, "nw")}
                  title="크기 조절"
                />
                <button
                  className="resize-handle ne"
                  onPointerDown={(event) => beginResize(event, "ne")}
                  title="크기 조절"
                />
                <button
                  className="resize-handle sw"
                  onPointerDown={(event) => beginResize(event, "sw")}
                  title="크기 조절"
                />
                <button
                  className="resize-handle se"
                  onPointerDown={(event) => beginResize(event, "se")}
                  title="크기 조절"
                />
                <span className="size-badge">
                  {Math.round(box.width)} × {Math.round(box.height)}
                </span>
              </div>
            )}
            <div className="scroll-hint">
              <span>테두리 드래그로 이동 · 꼭짓점 드래그로 크기 조절</span>
              <i />
            </div>
          </div>
        </div>
      </div>
      {orderMenu && (
        <div
          className="canvas-context-menu"
          style={{ left: orderMenu.x, top: orderMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
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
            disabled={selected === "page"}
            onClick={() => {
              onDelete(selected);
              setOrderMenu(null);
            }}
          >
            <span>×</span>
            <span>삭제</span>
          </button>
        </div>
      )}
    </section>
  );
}
