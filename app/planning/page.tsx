"use client";

import { useEffect, useMemo, useState } from "react";
import { CanvasEditor } from "@/components/planning/canvas-editor";
import { EditorHeader } from "@/components/planning/editor-header";
import {
  findLayerById,
  findLayerName,
  layers as initialLayers,
} from "@/components/planning/editor-data";
import { LeftPanel } from "@/components/planning/left-panel";
import { RightPanel } from "@/components/planning/right-panel";
import type {
  GeneratedScreen,
  Layer,
  LayerPosition,
  LayerSize,
  LayerStyle,
} from "@/components/planning/types";

export default function Home() {
  const [selected, setSelected] = useState("page");
  const [selectedIds, setSelectedIds] = useState<string[]>(["page"]);
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
  const [errorSnackbar, setErrorSnackbar] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState<string>();
  const [documentTitle, setDocumentTitle] = useState("Page");
  const [saved, setSaved] = useState("저장됨");
  const [focusRequestKey, setFocusRequestKey] = useState(0);
  const [focusPageId, setFocusPageId] = useState("page");
  const selectedName = useMemo(
    () => findLayerName(selected, layers),
    [selected, layers],
  );
  const selectedLayer = useMemo(
    () => findLayerById(selected, layers),
    [selected, layers],
  );
  const selectLayer = (id: string, additive = false) => {
    const nextSelectedIds = additive
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
    const controller = new AbortController();
    fetch("/api/generate-screen", { signal: controller.signal })
      .then(async (response) => {
        const result = (await response.json()) as {
          models?: string[];
          defaultModel?: string;
          warning?: string;
        };
        if (!response.ok || !result.models?.length) {
          throw new Error("OpenAI 모델 목록을 불러오지 못했습니다.");
        }
        setModels(result.models);
        setModel((current) =>
          current && result.models?.includes(current)
            ? current
            : (result.defaultModel ?? result.models?.[0] ?? ""),
        );
        setModelWarning(result.warning ?? "");
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
  }, []);

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
    setFocusPageId(id);
    setFocusRequestKey((current) => current + 1);
    setSaved("새 페이지 추가됨");
  };
  const saveProject = async () => {
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
        error?: string;
      };
      if (!response.ok || !result.saved)
        throw new Error(result.error ?? "저장에 실패했습니다.");
      if (result.id) setProjectId(result.id);
      setSaved("Firebase에 저장됨");
    } catch (error) {
      setSaved(error instanceof Error ? error.message : "저장 실패");
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
  const openProject = async (id: string) => {
    setSaved("불러오는 중...");
    const response = await fetch(
      `/api/projects?projectId=${encodeURIComponent(id)}`,
    );
    const result = (await response.json()) as {
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
      };
      error?: string;
    };
    if (!response.ok || !result.project)
      throw new Error(result.error ?? "문서를 불러오지 못했습니다.");
    const project = result.project;
    if (!Array.isArray(project.layers))
      throw new Error("저장된 레이어 데이터가 올바르지 않습니다.");
    setLayers(project.layers as Layer[]);
    setSizes(
      project.sizes && typeof project.sizes === "object"
        ? (project.sizes as Record<string, LayerSize>)
        : {},
    );
    setPositions(
      project.positions && typeof project.positions === "object"
        ? (project.positions as Record<string, LayerPosition>)
        : {},
    );
    setLayerText(
      project.layerText && typeof project.layerText === "object"
        ? (project.layerText as Record<string, string>)
        : {},
    );
    setLayerImages(
      project.layerImages && typeof project.layerImages === "object"
        ? (project.layerImages as Record<string, string>)
        : {},
    );
    setLayerStyles(
      project.layerStyles && typeof project.layerStyles === "object"
        ? (project.layerStyles as Record<string, LayerStyle>)
        : {},
    );
    setPrompt(typeof project.prompt === "string" ? project.prompt : "");
    setDocumentTitle(
      typeof project.title === "string" ? project.title : "Page",
    );
    setSelected(
      typeof project.selected === "string" ? project.selected : "page",
    );
    setSelectedIds([
      typeof project.selected === "string" ? project.selected : "page",
    ]);
    setProjectId(project.id);
    setSaved("Firebase에서 불러옴");
  };

  const generate = async () => {
    if (!prompt.trim() || !model) return;
    setGenerating(true);
    setErrorSnackbar(null);
    setSaved(`${model}이 화면을 설계하는 중...`);
    try {
      const response = await fetch("/api/generate-screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model }),
      });
      const result = (await response.json()) as {
        screen?: GeneratedScreen;
        model?: string;
        error?: string;
      };
      if (!response.ok || !result.screen) {
        throw new Error(result.error ?? "AI 화면을 생성하지 못했습니다.");
      }

      const screen = result.screen;
      const generationId = Date.now();
      const pageId = `ai-page-${generationId}`;
      const generatedLayers: Layer[] = screen.elements.map(
        (element, index) => ({
          id: `ai-${generationId}-${index + 1}`,
          name: element.name,
          kind: element.kind,
          ...(element.kind === "icon"
            ? {
                iconType: "mui" as const,
                iconInstance: element.iconInstance,
                iconSize: element.iconSize,
                iconColor: element.color,
              }
            : {}),
        }),
      );
      const nextSizes: Record<string, LayerSize> = {
        [pageId]: { width: screen.page.width, height: screen.page.height },
      };
      const nextPositions: Record<string, LayerPosition> = {
        [pageId]: { x: 0, y: 0 },
      };
      const nextText: Record<string, string> = {};
      const nextStyles: Record<string, LayerStyle> = {
        [pageId]: { backgroundColor: screen.page.backgroundColor },
      };

      screen.elements.forEach((element, index) => {
        const id = `ai-${generationId}-${index + 1}`;
        nextSizes[id] = { width: element.width, height: element.height };
        nextPositions[id] = { x: element.x, y: element.y };
        nextStyles[id] = {
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
          nextText[id] = element.text || element.name;
        }
      });

      setLayers([
        {
          id: pageId,
          name: screen.page.name,
          kind: "page",
          children: generatedLayers,
        },
      ]);
      setSizes(nextSizes);
      setPositions(nextPositions);
      setLayerText(nextText);
      setLayerImages({});
      setLayerStyles(nextStyles);
      setDocumentTitle(screen.title);
      setSelected(pageId);
      setSelectedIds([pageId]);
      setFocusPageId(pageId);
      setFocusRequestKey((current) => current + 1);
      setSaved(`${result.model ?? model} 화면 생성됨 · 저장 필요`);
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
      <EditorHeader saved={saved} />
      <section className="workspace">
        <LeftPanel
          title={documentTitle}
          onRenameTitle={(name) => {
            setDocumentTitle(name);
            setSaved("문서 제목 수정됨");
          }}
          layers={layers}
          selectedIds={selectedIds}
          onSelect={selectLayer}
          onMoveToParent={moveLayersToParent}
          onRename={renameLayer}
          onAdd={addLayer}
          onDelete={deleteLayer}
          onToggleVisibility={toggleVisibility}
          onToggleLock={toggleLock}
          onNewPage={addPage}
          onSave={saveProject}
          onDeletePage={deleteSelectedPage}
          onOpenProject={openProject}
          canDeletePage={
            selectedLayer?.kind === "page" &&
            layers.filter((item) => item.kind === "page").length > 1
          }
          saving={saving}
          prompt={prompt}
          onPromptChange={setPrompt}
          models={models}
          model={model}
          onModelChange={setModel}
          modelsLoading={modelsLoading}
          modelWarning={modelWarning}
          onGenerate={generate}
          generating={generating}
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
          onDelete={deleteLayer}
          onAdd={addLayer}
          onReorder={reorderLayer}
          onResize={(id, size) => {
            setSizes((current) => ({ ...current, [id]: size }));
            setSaved("크기 수정됨");
          }}
          onMove={(id, position) => {
            setPositions((current) => ({ ...current, [id]: position }));
            setSaved("위치 수정됨");
          }}
          selected={selected}
          onSelect={selectLayer}
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
            setLayerText((current) => ({ ...current, [selected]: value }));
            setSaved("텍스트 수정됨");
          }}
          onImage={(value) => {
            setLayerImages((current) => ({ ...current, [selected]: value }));
            setSaved("이미지 변경됨");
          }}
          onSize={(size) => {
            setSizes((current) => ({ ...current, [selected]: size }));
            setSaved("크기 수정됨");
          }}
          onPosition={(position) => {
            setPositions((current) => ({ ...current, [selected]: position }));
            setSaved("위치 수정됨");
          }}
          onLayerStyle={(style) => {
            setLayerStyles((current) => ({
              ...current,
              [selected]: { ...current[selected], ...style },
            }));
            setSaved("스타일 수정됨");
          }}
          onIconProperties={(properties) => {
            updateLayerState(selected, (layer) => ({
              ...layer,
              ...properties,
            }));
            setSaved("아이콘 속성 수정됨");
          }}
          onOptionProperties={(properties) => {
            updateLayerState(selected, (layer) => ({
              ...layer,
              ...properties,
            }));
            setSaved("선택 옵션 속성 수정됨");
          }}
        />
      </section>
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
