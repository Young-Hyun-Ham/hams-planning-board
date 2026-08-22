import { useEffect, useRef, useState } from "react";
import { Icon } from "./icon";
import type { Layer } from "./types";

type AiPromptChat = {
  id: string;
  prompt: string;
  model: string;
  screenTitle: string;
  createdAt: string | null;
};
type SelectionMode = "single" | "toggle" | "range";

type RowProps = {
  layer: Layer;
  depth?: number;
  selectedIds: string[];
  draggedIds: string[];
  dropTargetId: string | null;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onDragStart: (event: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent, layer: Layer) => void;
  onDrop: (event: React.DragEvent, layer: Layer) => void;
  onRename: (id: string, name: string) => void;
  onContextMenu: (event: React.MouseEvent, layer: Layer) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
};
const layerIcon = (layer: Layer) =>
  layer.kind === "section"
    ? "frame"
    : layer.kind === "layer"
      ? "group"
      : layer.kind;

function LayerRow({
  layer,
  depth = 0,
  selectedIds,
  draggedIds,
  dropTargetId,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onRename,
  onContextMenu,
  onToggleVisibility,
  onToggleLock,
}: RowProps) {
  const [open, setOpen] = useState(layer.kind !== "page"),
    [renaming, setRenaming] = useState(false);
  const nameRef = useRef<HTMLSpanElement>(null);
  const beginRename = (event: React.MouseEvent) => {
    event.stopPropagation();
    setRenaming(true);
    requestAnimationFrame(() => {
      const target = nameRef.current;
      if (!target) return;
      target.focus();
      const range = document.createRange(),
        selection = window.getSelection();
      range.selectNodeContents(target);
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  };
  return (
    <>
      <div
        className={`layer-row ${selectedIds.includes(layer.id) ? "selected" : ""} ${draggedIds.includes(layer.id) ? "dragging" : ""} ${dropTargetId === layer.id ? "drop-target" : ""} ${layer.visible === false ? "hidden-layer" : ""}`}
        style={{ paddingLeft: 10 + depth * 18 }}
        draggable={!renaming && layer.kind !== "page"}
        aria-selected={selectedIds.includes(layer.id)}
        data-layer-row-id={layer.id}
        onClick={(event) => onSelect(layer.id, event)}
        onContextMenu={(event) => onContextMenu(event, layer)}
        onDragStart={(event) => onDragStart(event, layer.id)}
        onDragEnd={onDragEnd}
        onDragOver={(event) => {
          if (
            layer.kind === "page" ||
            layer.kind === "section" ||
            layer.kind === "layer"
          ) {
            setOpen(true);
          }
          onDragOver(event, layer);
        }}
        onDrop={(event) => onDrop(event, layer)}
      >
        <span
          className="layer-toggle"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(!open);
          }}
        >
          {layer.children ? (
            <Icon name={open ? "down" : "chevron"} size={12} />
          ) : null}
        </span>
        <span className={`layer-icon ${layer.kind}`}>
          <Icon name={layerIcon(layer)} size={14} />
        </span>
        <span
          ref={nameRef}
          className={renaming ? "layer-name editing" : "layer-name"}
          contentEditable={renaming}
          suppressContentEditableWarning
          onDoubleClick={beginRename}
          onBlur={(event) => {
            const name = event.currentTarget.innerText.trim();
            if (name) onRename(layer.id, name);
            else event.currentTarget.innerText = layer.name;
            setRenaming(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              event.currentTarget.innerText = layer.name;
              event.currentTarget.blur();
            }
          }}
        >
          {layer.name}
        </span>
        <span className="layer-row-actions">
          <button
            title={layer.visible === false ? "보이기" : "숨기기"}
            onClick={(event) => {
              event.stopPropagation();
              onToggleVisibility(layer.id);
            }}
          >
            <Icon name={layer.visible === false ? "eyeOff" : "eye"} size={14} />
          </button>
          <button
            className={layer.locked ? "active" : ""}
            title={layer.locked ? "잠금 해제" : "잠금"}
            onClick={(event) => {
              event.stopPropagation();
              onToggleLock(layer.id);
            }}
          >
            <Icon name={layer.locked ? "lock" : "unlock"} size={13} />
          </button>
        </span>
      </div>
      {open &&
        layer.children?.map((child) => (
          <LayerRow
            key={child.id}
            layer={child}
            depth={depth + 1}
            selectedIds={selectedIds}
            draggedIds={draggedIds}
            dropTargetId={dropTargetId}
            onSelect={onSelect}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onRename={onRename}
            onContextMenu={onContextMenu}
            onToggleVisibility={onToggleVisibility}
            onToggleLock={onToggleLock}
          />
        ))}
    </>
  );
}

type Props = {
  title: string;
  onRenameTitle: (name: string) => void;
  layers: Layer[];
  selectedIds: string[];
  selectionAnchor: string;
  onSelect: (id: string, mode?: SelectionMode, rangeIds?: string[]) => void;
  onMoveToParent: (ids: string[], parentId: string) => void;
  onRename: (id: string, name: string) => void;
  onAdd: (
    parentId: string,
    kind: Layer["kind"],
    legacyVariant?: "button",
  ) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onNewPage: () => void;
  onSave: () => void;
  onDeletePage: () => void;
  onOpenProject: (id: string) => Promise<void>;
  canDeletePage: boolean;
  saving: boolean;
  prompt: string;
  onPromptChange: (value: string) => void;
  models: string[];
  model: string;
  onModelChange: (value: string) => void;
  modelsLoading: boolean;
  modelWarning: string;
  projectId?: string;
  aiHistoryVersion: number;
  onGenerate: () => void;
  generating: boolean;
};

export function LeftPanel({
  title,
  onRenameTitle,
  layers,
  selectedIds,
  selectionAnchor,
  onSelect,
  onMoveToParent,
  onRename,
  onAdd,
  onDelete,
  onToggleVisibility,
  onToggleLock,
  onNewPage,
  onSave,
  onDeletePage,
  onOpenProject,
  canDeletePage,
  saving,
  prompt,
  onPromptChange,
  models,
  model,
  onModelChange,
  modelsLoading,
  modelWarning,
  projectId,
  aiHistoryVersion,
  onGenerate,
  generating,
}: Props) {
  const [menu, setMenu] = useState<{
      x: number;
      y: number;
      layer: Layer;
    } | null>(null),
    [pageMenu, setPageMenu] = useState(false);
  const [draggedIds, setDraggedIds] = useState<string[]>([]);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [aiHistory, setAiHistory] = useState<AiPromptChat[]>([]);
  const [aiHistoryLoading, setAiHistoryLoading] = useState(true);
  const [aiHistoryError, setAiHistoryError] = useState("");
  const [tab, setTab] = useState<"layers" | "pages">("layers"),
    [projects, setProjects] = useState<
      { id: string; title: string; status: string; updatedAt: string | null }[]
    >([]),
    [projectsLoading, setProjectsLoading] = useState(false),
    [projectsError, setProjectsError] = useState("");
  useEffect(() => {
    const close = () => {
      setMenu(null);
      setPageMenu(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("blur", close);
    };
  }, []);
  useEffect(() => {
    if (!historyOpen) return;
    const closeHistory = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest(".ai-history-panel, .ai-history-button")
      )
        return;
      setHistoryOpen(false);
    };
    window.addEventListener("pointerdown", closeHistory);
    return () => window.removeEventListener("pointerdown", closeHistory);
  }, [historyOpen]);
  useEffect(() => {
    if (tab !== "layers") return;
    const button = document.querySelector<HTMLButtonElement>(
      ".left-panel .panel-tabs button:nth-child(2)",
    );
    const openPages = () => {
      setProjectsLoading(true);
      setProjectsError("");
      setTab("pages");
    };
    button?.addEventListener("click", openPages);
    return () => button?.removeEventListener("click", openPages);
  }, [tab]);
  useEffect(() => {
    if (tab !== "layers") return;
    const label = document.querySelector<HTMLSpanElement>(
      ".left-panel .page-label > span",
    );
    if (!label) return;
    label.innerText = title;
    const edit = () => {
      label.contentEditable = "true";
      label.classList.add("editing");
      label.focus();
      const range = document.createRange(),
        selection = window.getSelection();
      range.selectNodeContents(label);
      selection?.removeAllRanges();
      selection?.addRange(range);
    };
    const commit = () => {
      const name = label.innerText.trim();
      label.contentEditable = "false";
      label.classList.remove("editing");
      if (name) onRenameTitle(name);
      else label.innerText = title;
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        label.blur();
      }
      if (event.key === "Escape") {
        label.innerText = title;
        label.blur();
      }
    };
    label.title = "더블클릭하여 문서 제목 변경";
    label.addEventListener("dblclick", edit);
    label.addEventListener("blur", commit);
    label.addEventListener("keydown", key);
    return () => {
      label.removeEventListener("dblclick", edit);
      label.removeEventListener("blur", commit);
      label.removeEventListener("keydown", key);
    };
  }, [tab, title, onRenameTitle]);
  useEffect(() => {
    if (tab !== "pages") return;
    const controller = new AbortController();
    fetch("/api/projects", { signal: controller.signal })
      .then(async (response) => {
        const result = (await response.json()) as {
          projects?: {
            id: string;
            title: string;
            status: string;
            updatedAt: string | null;
          }[];
          error?: string;
        };
        if (!response.ok) throw new Error(result.error ?? "조회 실패");
        setProjects(result.projects ?? []);
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError")
          setProjectsError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setProjectsLoading(false);
      });
    return () => controller.abort();
  }, [tab]);
  useEffect(() => {
    if (!historyOpen) return;
    if (!projectId) return;

    const controller = new AbortController();
    fetch(`/api/projects/${encodeURIComponent(projectId)}/ai-prompt-chats`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          chats?: AiPromptChat[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(
            result.error ?? "AI 프롬프트 내역을 불러오지 못했습니다.",
          );
        }
        setAiHistoryError("");
        setAiHistory(result.chats ?? []);
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setAiHistoryError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAiHistoryLoading(false);
      });
    return () => controller.abort();
  }, [historyOpen, projectId, aiHistoryVersion]);
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
  const canHaveChildren =
    menu &&
    (menu.layer.kind === "page" ||
      menu.layer.kind === "section" ||
      menu.layer.kind === "layer");
  const openMenu = (event: React.MouseEvent, layer: Layer) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(layer.id);
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - 170),
      y: Math.min(event.clientY, window.innerHeight - 390),
      layer,
    });
  };
  const findInTree = (items: Layer[], id: string): Layer | undefined => {
    for (const item of items) {
      if (item.id === id) return item;
      const found = item.children && findInTree(item.children, id);
      if (found) return found;
    }
  };
  const containsLayer = (layer: Layer, id: string): boolean =>
    layer.id === id ||
    Boolean(layer.children?.some((child) => containsLayer(child, id)));
  const canReceiveDrop = (layer: Layer) =>
    (layer.kind === "page" ||
      layer.kind === "section" ||
      layer.kind === "layer") &&
    !draggedIds.some((id) => {
      const draggedLayer = findInTree(layers, id);
      return draggedLayer ? containsLayer(draggedLayer, layer.id) : false;
    });
  const selectTreeLayer = (id: string, event: React.MouseEvent) => {
    if (event.shiftKey) {
      const visibleIds = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".left-panel .layer-tree [data-layer-row-id]",
        ),
        (row) => row.dataset.layerRowId,
      ).filter((rowId): rowId is string => Boolean(rowId));
      const anchorIndex = visibleIds.indexOf(selectionAnchor);
      const selectedIndex = visibleIds.indexOf(id);
      if (anchorIndex >= 0 && selectedIndex >= 0) {
        const start = Math.min(anchorIndex, selectedIndex);
        const end = Math.max(anchorIndex, selectedIndex);
        onSelect(id, "range", visibleIds.slice(start, end + 1));
        return;
      }
    }
    onSelect(id, event.ctrlKey || event.metaKey ? "toggle" : "single");
  };
  const startDrag = (event: React.DragEvent, id: string) => {
    const ids = selectedIds.includes(id)
      ? selectedIds.filter(
          (selectedId) => findInTree(layers, selectedId)?.kind !== "page",
        )
      : [id];
    if (!selectedIds.includes(id)) onSelect(id);
    setDraggedIds(ids);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", ids.join(","));
  };
  const endDrag = () => {
    setDraggedIds([]);
    setDropTargetId(null);
  };
  const dragOver = (event: React.DragEvent, layer: Layer) => {
    if (!draggedIds.length || !canReceiveDrop(layer)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDropTargetId(layer.id);
  };
  const drop = (event: React.DragEvent, layer: Layer) => {
    event.preventDefault();
    event.stopPropagation();
    if (draggedIds.length && canReceiveDrop(layer)) {
      onMoveToParent(draggedIds, layer.id);
    }
    endDrag();
  };
  if (tab === "pages")
    return (
      <aside className="left-panel">
        <div className="panel-tabs">
          <button onClick={() => setTab("layers")}>레이어</button>
          <button className="active">페이지</button>
        </div>
        <div className="project-list-head">
          <strong>저장된 페이지</strong>
          <span>{projects.length}</span>
        </div>
        <div className="project-list">
          {projectsLoading ? (
            <div className="project-list-state">불러오는 중...</div>
          ) : projectsError ? (
            <div className="project-list-state error">{projectsError}</div>
          ) : projects.length === 0 ? (
            <div className="project-list-state">저장된 문서가 없습니다.</div>
          ) : (
            projects.map((project) => (
              <div
                className="project-list-item"
                key={project.id}
                title="더블클릭하여 열기"
                onDoubleClick={async () => {
                  setProjectsError("");
                  try {
                    await onOpenProject(project.id);
                    setTab("layers");
                  } catch (error) {
                    setProjectsError(
                      error instanceof Error
                        ? error.message
                        : "문서를 불러오지 못했습니다.",
                    );
                  }
                }}
              >
                <span className="project-list-icon">
                  <Icon name="page" size={14} />
                </span>
                <div>
                  <strong>{project.title}</strong>
                  <small>
                    {project.updatedAt
                      ? new Date(project.updatedAt).toLocaleString("ko-KR")
                      : "저장 시간 없음"}
                  </small>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    );
  return (
    <aside className="left-panel">
      <div className="panel-tabs">
        <button className="active">레이어</button>
        <button>페이지</button>
      </div>
      <div className="page-label">
        <span>홈</span>
        <button
          className="page-more-button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setPageMenu(!pageMenu)}
        >
          <Icon name="more" size={15} />
        </button>
        {pageMenu && (
          <div
            className="page-menu"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => {
                onNewPage();
                setPageMenu(false);
              }}
            >
              <Icon name="plus" size={14} />새 페이지 추가
            </button>
            <button
              onClick={() => {
                onSave();
                setPageMenu(false);
              }}
              disabled={saving}
            >
              <span>◇</span>
              {saving ? "저장 중..." : "저장"}
            </button>
            <div className="context-separator" />
            <button
              className="context-delete"
              disabled={!canDeletePage}
              onClick={() => {
                onDeletePage();
                setPageMenu(false);
              }}
            >
              × 삭제
            </button>
          </div>
        )}
      </div>
      <div className="layer-tree">
        {layers.map((layer) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            selectedIds={selectedIds}
            draggedIds={draggedIds}
            dropTargetId={dropTargetId}
            onSelect={selectTreeLayer}
            onDragStart={startDrag}
            onDragEnd={endDrag}
            onDragOver={dragOver}
            onDrop={drop}
            onRename={onRename}
            onContextMenu={openMenu}
            onToggleVisibility={onToggleVisibility}
            onToggleLock={onToggleLock}
          />
        ))}
      </div>
      {menu && (
        <div
          className="layer-context-menu"
          style={{ left: menu.x, top: menu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {canHaveChildren && (
            <>
              <div className="layer-add-group">
                <button className="layer-add-trigger">
                  <Icon name="plus" size={14} />
                  <span>{menu.layer.name}에 추가</span>
                  <span className="context-arrow">▸</span>
                </button>
                <div className="layer-add-submenu">
                  {additions.map((item) => (
                    <button
                      key={item.kind}
                      onClick={() => {
                        onAdd(menu.layer.id, item.kind);
                        setMenu(null);
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
              <div className="context-separator" />
            </>
          )}
          <button
            className="context-delete"
            disabled={
              menu.layer.kind === "page" &&
              layers.filter((item) => item.kind === "page").length <= 1
            }
            onClick={() => {
              onDelete(menu.layer.id);
              setMenu(null);
            }}
          >
            × 삭제
          </button>
        </div>
      )}
      <div className="ai-card">
        <div className="ai-title">
          <span className="ai-icon">
            <Icon name="sparkle" size={16} />
          </span>
          <strong>AI로 화면 만들기</strong>
          <button
            type="button"
            className="ai-history-button"
            title="AI 프롬프트 기록"
            aria-label="AI 프롬프트 기록 보기"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((current) => !current)}
          >
            <Icon name="history" size={15} />
          </button>
        </div>
        {historyOpen && (
          <div
            className="ai-history-panel"
            role="dialog"
            aria-label="AI 프롬프트 기록"
          >
            <div className="ai-history-head">
              <strong>프롬프트 기록</strong>
              <span>{aiHistory.length}</span>
            </div>
            <div className="ai-history-list">
              {projectId && aiHistoryLoading ? (
                <div className="ai-history-state">불러오는 중...</div>
              ) : aiHistoryError ? (
                <div className="ai-history-state error">{aiHistoryError}</div>
              ) : aiHistory.length === 0 ? (
                <div className="ai-history-state">
                  아직 생성 내역이 없습니다.
                </div>
              ) : (
                aiHistory.map((chat) => (
                  <article className="ai-history-item" key={chat.id}>
                    <p>{chat.prompt}</p>
                    <div>
                      <span>{chat.screenTitle || "AI 화면"}</span>
                      <span>{chat.model}</span>
                    </div>
                    <time dateTime={chat.createdAt ?? undefined}>
                      {chat.createdAt
                        ? new Date(chat.createdAt).toLocaleString("ko-KR")
                        : "방금 전"}
                    </time>
                  </article>
                ))
              )}
            </div>
          </div>
        )}
        <textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              onGenerate();
            }
          }}
          placeholder="예: 미니멀한 개인 홈페이지를 기획해줘"
          maxLength={2000}
          disabled={generating}
        />
        <label className="ai-model-field">
          <span>사용 모델</span>
          <select
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
            disabled={generating || modelsLoading || models.length === 0}
          >
            {modelsLoading && models.length === 0 ? (
              <option value="">모델 불러오는 중...</option>
            ) : (
              models.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          onClick={onGenerate}
          disabled={generating || !prompt.trim() || !model}
          aria-busy={generating}
        >
          {generating ? "화면 설계 중..." : "생성하기"}
          <span>Ctrl/⌘ ↵</span>
        </button>
        <p className={modelWarning ? "ai-model-warning" : undefined}>
          {modelWarning || "AI가 화면 구조와 콘텐츠를 자동으로 설계합니다."}
        </p>
      </div>
    </aside>
  );
}
