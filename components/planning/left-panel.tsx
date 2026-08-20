import { useEffect, useRef, useState } from "react";
import { Icon } from "./icon";
import type { Layer } from "./types";

type RowProps = {
  layer: Layer;
  depth?: number;
  selected: string;
  onSelect: (id: string) => void;
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
  selected,
  onSelect,
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
        className={`layer-row ${selected === layer.id ? "selected" : ""} ${layer.visible === false ? "hidden-layer" : ""}`}
        style={{ paddingLeft: 10 + depth * 18 }}
        onClick={() => onSelect(layer.id)}
        onContextMenu={(event) => onContextMenu(event, layer)}
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
            selected={selected}
            onSelect={onSelect}
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
  selected: string;
  onSelect: (id: string) => void;
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
  onGenerate: () => void;
  generating: boolean;
};

export function LeftPanel({
  title,
  onRenameTitle,
  layers,
  selected,
  onSelect,
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
  onGenerate,
  generating,
}: Props) {
  const [menu, setMenu] = useState<{
      x: number;
      y: number;
      layer: Layer;
    } | null>(null),
    [pageMenu, setPageMenu] = useState(false);
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
  const additions: { kind: Layer["kind"]; label: string }[] = [
    { kind: "layer", label: "Layer" },
    { kind: "section", label: "Section" },
    { kind: "text", label: "Text" },
    { kind: "image", label: "Image" },
    { kind: "clipboard", label: "Clipboard" },
    { kind: "button", label: "Button" },
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
      y: Math.min(event.clientY, window.innerHeight - 270),
      layer,
    });
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
            selected={selected}
            onSelect={onSelect}
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
              <div className="context-title">{menu.layer.name}에 추가</div>
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
              <div className="context-separator" />
            </>
          )}
          <button
            className="context-delete"
            disabled={menu.layer.kind === "page"}
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
        </div>
        <textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="예: 미니멀한 개인 홈페이지를 기획해줘"
        />
        <button onClick={onGenerate} disabled={generating}>
          {generating ? "화면 설계 중..." : "생성하기"}
          <span>→</span>
        </button>
        <p>AI가 화면 구조와 콘텐츠를 자동으로 설계합니다.</p>
      </div>
    </aside>
  );
}
