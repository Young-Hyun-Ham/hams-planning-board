"use client";

import { useEffect, useMemo, useState } from "react";
import { CanvasEditor } from "@/components/planning/canvas-editor";
import { EditorHeader } from "@/components/planning/editor-header";
import {
  findLayerById,
  findLayerName,
  initialContent,
  layers as initialLayers,
} from "@/components/planning/editor-data";
import { LeftPanel } from "@/components/planning/left-panel";
import { RightPanel } from "@/components/planning/right-panel";
import type {
  EditableContent,
  Layer,
  LayerPosition,
  LayerSize,
} from "@/components/planning/types";

export default function Home() {
  const [selected, setSelected] = useState("page");
  const [layers, setLayers] = useState<Layer[]>(initialLayers);
  const [sizes, setSizes] = useState<Record<string, LayerSize>>({});
  const [positions, setPositions] = useState<Record<string, LayerPosition>>({});
  const [layerText, setLayerText] = useState<Record<string, string>>({});
  const [layerImages, setLayerImages] = useState<Record<string, string>>({});
  const [content, setContent] = useState<EditableContent>(initialContent);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState<string>();
  const [documentTitle, setDocumentTitle] = useState("Page");
  const [saved, setSaved] = useState("저장됨");
  const [focusRequestKey, setFocusRequestKey] = useState(0);
  const selectedName = useMemo(
    () => findLayerName(selected, layers),
    [selected, layers],
  );
  const selectedLayer = useMemo(
    () => findLayerById(selected, layers),
    [selected, layers],
  );

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
    };
    const layer: Layer = {
      id,
      name: labels[kind],
      kind,
      children: kind === "layer" || kind === "section" ? [] : undefined,
    };
    const insertChild = (items: Layer[]): Layer[] =>
      items.map((item) =>
        item.id === parentId &&
        (item.kind === "page" ||
          item.kind === "section" ||
          item.kind === "layer")
          ? { ...item, children: [...(item.children ?? []), layer] }
          : {
              ...item,
              children: item.children ? insertChild(item.children) : undefined,
            },
      );
    setLayers((current) => insertChild(current));
    const defaultSize =
      kind === "section" || kind === "layer"
        ? { width: 150, height: 100 }
        : kind === "text" || kind === "button"
          ? { width: 110, height: 32 }
          : { width: 110, height: 80 };
    setSizes((current) => ({ ...current, [id]: defaultSize }));
    setPositions((current) => ({ ...current, [id]: { x: 0, y: 0 } }));
    setSelected(id);
    setFocusRequestKey((current) => current + 1);
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
    if (id === "page") return;
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
    setSelected("page");
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
    if (selectedLayer?.kind !== "page" || selectedLayer.id === "page") return;
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
    setPrompt(typeof project.prompt === "string" ? project.prompt : "");
    setDocumentTitle(
      typeof project.title === "string" ? project.title : "Page",
    );
    setSelected(
      typeof project.selected === "string" ? project.selected : "page",
    );
    setProjectId(project.id);
    setSaved("Firebase에서 불러옴");
  };

  const updateContent = <K extends keyof EditableContent>(
    key: K,
    value: EditableContent[K],
  ) => {
    setContent((current) => ({ ...current, [key]: value }));
    setSaved("수정됨");
  };

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setSaved("생성 중...");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, title: "개인 포트폴리오 웹사이트" }),
      });
      const result = (await response.json()) as { saved?: boolean };
      setSaved(result.saved ? "Firebase에 저장됨" : "데모 모드 · 로컬 생성");
    } catch {
      setSaved("로컬 생성됨");
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
          selected={selected}
          onSelect={setSelected}
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
            selectedLayer?.kind === "page" && selectedLayer.id !== "page"
          }
          saving={saving}
          prompt={prompt}
          onPromptChange={setPrompt}
          onGenerate={generate}
          generating={generating}
        />
        <CanvasEditor
          projectId={projectId}
          focusRequestKey={focusRequestKey}
          layers={layers}
          sizes={sizes}
          positions={positions}
          layerText={layerText}
          layerImages={layerImages}
          onDelete={deleteLayer}
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
          content={content}
          onSelect={setSelected}
          onUpdate={updateContent}
        />
        <RightPanel
          selected={selected}
          selectedName={selectedName}
          selectedLayer={selectedLayer}
          content={content}
          layerText={layerText[selected] ?? selectedName}
          imageSrc={layerImages[selected]}
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
          onUpdate={updateContent}
        />
      </section>
    </main>
  );
}
