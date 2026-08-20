import { useState } from "react";
import { createPublishingCode } from "./editor-data";
import { Icon } from "./icon";
import type {
  EditableContent,
  Layer,
  LayerPosition,
  LayerSize,
  UpdateContent,
} from "./types";

function Property({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="property">
      <div className="property-title">
        <b>{title}</b>
        <Icon name="down" size={13} />
      </div>
      {children}
    </section>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} readOnly />
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
  size,
  position,
  onLayerText,
  onImage,
  onUpdate,
}: {
  selected: string;
  selectedName: string;
  selectedLayer?: Layer;
  content: EditableContent;
  layerText: string;
  imageSrc?: string;
  size?: LayerSize;
  position?: LayerPosition;
  onLayerText: (value: string) => void;
  onImage: (value: string) => void;
  onUpdate: UpdateContent;
}) {
  const [tab, setTab] = useState<"design" | "code">("design");
  const field = fieldByLayer[selected];
  const isImage =
    selectedLayer?.kind === "image" || selectedLayer?.kind === "clipboard";
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
              <Field label="X" value={String(position?.x ?? 0)} />
              <Field label="Y" value={String(position?.y ?? 0)} />
              <Field label="W" value={String(size?.width ?? 548)} />
              <Field label="H" value={String(size?.height ?? 144)} />
            </div>
            <div className="select-field">
              <span>{size || position ? "사용자 지정 배치" : "기본 배치"}</span>
              <Icon name="down" size={12} />
            </div>
          </Property>
          <Property title="타이포그래피">
            <div className="font-row">
              <div>
                <small>Font</small>
                <b>Pretendard</b>
              </div>
              <b>Bold</b>
            </div>
            <div className="field-grid two">
              <Field label="크기" value="56" />
              <Field label="행간" value="1.3" />
            </div>
            <div className="color-row">
              <span className="swatch" />
              <span>#18181B</span>
              <span>100%</span>
            </div>
          </Property>
          <Property title="효과">
            <div className="empty-effect">+ 효과 추가</div>
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
