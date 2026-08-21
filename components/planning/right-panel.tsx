import { useState } from "react";
import { createPublishingCode } from "./editor-data";
import { Icon } from "./icon";
import type {
  EditableContent,
  Layer,
  LayerPosition,
  LayerSize,
  LayerStyle,
  UpdateContent,
} from "./types";

function Property({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className={`property ${open ? "open" : "collapsed"}`}>
      <button
        type="button"
        className="property-title"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <b>{title}</b>
        <span className="property-chevron">
          <Icon name="down" size={13} />
        </span>
      </button>
      {open && <div className="property-content">{children}</div>}
    </section>
  );
}
function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

const fieldByLayer: Partial<Record<string, keyof EditableContent>> = {
  logo: "logo",
  eyebrow: "eyebrow",
  heading: "heading",
  description: "description",
  cta: "cta",
};

export function RightPanel({
  selected,
  selectedName,
  selectedLayer,
  content,
  layerText,
  imageSrc,
  layerStyle,
  size,
  position,
  onLayerText,
  onImage,
  onSize,
  onPosition,
  onLayerStyle,
  onUpdate,
}: {
  selected: string;
  selectedName: string;
  selectedLayer?: Layer;
  content: EditableContent;
  layerText: string;
  imageSrc?: string;
  layerStyle: LayerStyle;
  size?: LayerSize;
  position?: LayerPosition;
  onLayerText: (value: string) => void;
  onImage: (value: string) => void;
  onSize: (size: LayerSize) => void;
  onPosition: (position: LayerPosition) => void;
  onLayerStyle: (style: Partial<LayerStyle>) => void;
  onUpdate: UpdateContent;
}) {
  const [tab, setTab] = useState<"design" | "code">("design");
  const field = fieldByLayer[selected];
  const isImage =
    selectedLayer?.kind === "image" || selectedLayer?.kind === "clipboard";
  const isText =
    selectedLayer?.kind === "text" || selectedLayer?.kind === "button";
  const effectOptions = isText
    ? (["none", "text-shadow", "shadow"] as const)
    : isImage
      ? (["none", "shadow", "soft-shadow", "blur", "grayscale"] as const)
      : (["none", "shadow", "soft-shadow", "blur"] as const);
  const defaultWidth = selectedLayer?.kind === "page" ? 860 : 150;
  const defaultHeight = selectedLayer?.kind === "page" ? 560 : 100;
  const chooseImage = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onImage(reader.result);
    };
    reader.readAsDataURL(file);
  };
  const code = createPublishingCode();
  return (
    <aside className="right-panel">
      <div className="inspector-tabs">
        <button
          className={tab === "design" ? "active" : ""}
          onClick={() => setTab("design")}
        >
          디자인
        </button>
        <button
          className={tab === "code" ? "active" : ""}
          onClick={() => setTab("code")}
        >
          코드
        </button>
      </div>
      {tab === "design" ? (
        <div className="inspector">
          <div className="selection-title">
            <span>{selectedName}</span>
            <Icon name="more" size={16} />
          </div>
          {field && (
            <Property title="콘텐츠">
              <textarea
                className="content-field"
                value={content[field]}
                onChange={(event) => onUpdate(field, event.target.value)}
              />
            </Property>
          )}
          {!field &&
            (selectedLayer?.kind === "text" ||
              selectedLayer?.kind === "button") && (
              <Property title="콘텐츠">
                <textarea
                  className="content-field"
                  value={layerText}
                  onChange={(event) => onLayerText(event.target.value)}
                  placeholder="텍스트를 입력하세요"
                />
              </Property>
            )}
          {isImage && (
            <Property
              title={
                selectedLayer?.kind === "clipboard"
                  ? "클립보드 이미지"
                  : "이미지"
              }
            >
              <div
                className={`image-option-preview ${imageSrc ? "has-image" : ""}`}
                style={
                  imageSrc ? { backgroundImage: `url(${imageSrc})` } : undefined
                }
              >
                {!imageSrc && (
                  <Icon
                    name={
                      selectedLayer?.kind === "clipboard"
                        ? "clipboard"
                        : "image"
                    }
                    size={24}
                  />
                )}
              </div>
              <label className="file-upload-button">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => chooseImage(event.target.files?.[0])}
                />
                <Icon name="image" size={14} /> 이미지 첨부
              </label>
              {selectedLayer?.kind === "clipboard" && (
                <p className="clipboard-help">
                  이미지를 복사한 후 Ctrl+V로 붙여넣을 수 있습니다.
                </p>
              )}
            </Property>
          )}
          <Property title="레이아웃">
            <div className="field-grid four">
              <Field
                label="X"
                value={position?.x ?? 0}
                onChange={(x) => onPosition({ x, y: position?.y ?? 0 })}
              />
              <Field
                label="Y"
                value={position?.y ?? 0}
                onChange={(y) => onPosition({ x: position?.x ?? 0, y })}
              />
              <Field
                label="W"
                value={size?.width ?? defaultWidth}
                onChange={(width) =>
                  onSize({
                    width: Math.max(1, width),
                    height: size?.height ?? defaultHeight,
                  })
                }
              />
              <Field
                label="H"
                value={size?.height ?? defaultHeight}
                onChange={(height) =>
                  onSize({
                    width: size?.width ?? defaultWidth,
                    height: Math.max(1, height),
                  })
                }
              />
            </div>
            <div className="select-field">
              <span>{size || position ? "사용자 지정 배치" : "기본 배치"}</span>
              <Icon name="down" size={12} />
            </div>
          </Property>
          {isText && (
            <Property title="타이포그래피">
              <div className="font-row">
                <div>
                  <small>Font</small>
                  <b>Pretendard</b>
                </div>
                <b>Bold</b>
              </div>
              <div className="field-grid two">
                <Field
                  label="크기"
                  value={layerStyle.fontSize ?? 14}
                  onChange={(fontSize) => onLayerStyle({ fontSize })}
                />
                <Field
                  label="행간"
                  value={layerStyle.lineHeight ?? 1.4}
                  onChange={(lineHeight) => onLayerStyle({ lineHeight })}
                />
              </div>
              <div className="color-row">
                <input
                  className="color-input"
                  type="color"
                  value={layerStyle.color ?? "#18181b"}
                  onChange={(event) =>
                    onLayerStyle({ color: event.target.value })
                  }
                />
                <span>{layerStyle.color ?? "#18181B"}</span>
                <select
                  value={layerStyle.fontWeight ?? 400}
                  onChange={(event) =>
                    onLayerStyle({ fontWeight: Number(event.target.value) })
                  }
                >
                  <option value={400}>Regular</option>
                  <option value={500}>Medium</option>
                  <option value={600}>Semi Bold</option>
                  <option value={700}>Bold</option>
                </select>
              </div>
            </Property>
          )}
          {!isText && (
            <Property title="모양">
              <div className="field-grid two">
                <Field
                  label="투명도"
                  value={Math.round((layerStyle.opacity ?? 1) * 100)}
                  onChange={(opacity) =>
                    onLayerStyle({
                      opacity: Math.max(0, Math.min(100, opacity)) / 100,
                    })
                  }
                />
                <Field
                  label="모서리"
                  value={layerStyle.borderRadius ?? 0}
                  onChange={(borderRadius) =>
                    onLayerStyle({ borderRadius: Math.max(0, borderRadius) })
                  }
                />
              </div>
              {!isImage && (
                <label className="color-option">
                  <span>배경색</span>
                  <input
                    type="color"
                    value={layerStyle.backgroundColor ?? "#ffffff"}
                    onChange={(event) =>
                      onLayerStyle({ backgroundColor: event.target.value })
                    }
                  />
                </label>
              )}
            </Property>
          )}
          <Property title="효과">
            <select
              className="effect-select"
              value={layerStyle.effect ?? "none"}
              onChange={(event) =>
                onLayerStyle({
                  effect: event.target.value as LayerStyle["effect"],
                })
              }
            >
              {effectOptions.map((effect) => (
                <option key={effect} value={effect}>
                  {effect === "none"
                    ? "효과 없음"
                    : effect === "shadow"
                      ? "그림자"
                      : effect === "soft-shadow"
                        ? "부드러운 그림자"
                        : effect === "blur"
                          ? "블러"
                          : effect === "grayscale"
                            ? "흑백"
                            : "텍스트 그림자"}
                </option>
              ))}
            </select>
          </Property>
        </div>
      ) : (
        <div className="code-panel">
          <div className="code-head">
            <span>HTML</span>
            <button onClick={() => navigator.clipboard?.writeText(code)}>
              복사
            </button>
          </div>
          <pre>
            <code>{code}</code>
          </pre>
          <div className="code-note">
            편집한 텍스트가 코드에 실시간 반영됩니다.
          </div>
        </div>
      )}
    </aside>
  );
}
