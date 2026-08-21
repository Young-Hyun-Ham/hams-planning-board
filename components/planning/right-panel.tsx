import { useEffect, useState } from "react";
import { muiIcons } from "../icons/mui";
import { svgIcons } from "../icons/svg";
import {
  captureCanvasSource,
  createPublishingCode,
  type PublishingCode,
  type PublishingTarget,
} from "./editor-data";
import { Icon } from "./icon";
import type { Layer, LayerPosition, LayerSize, LayerStyle } from "./types";

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

export function RightPanel({
  selectedName,
  selectedLayer,
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
  onIconProperties,
  onOptionProperties,
}: {
  selectedName: string;
  selectedLayer?: Layer;
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
  onIconProperties: (
    properties: Pick<
      Layer,
      "iconType" | "iconInstance" | "iconSize" | "iconColor"
    >,
  ) => void;
  onOptionProperties: (
    properties: Pick<
      Layer,
      "optionLabel" | "optionCount" | "optionOrientation" | "optionItems"
    >,
  ) => void;
}) {
  const [tab, setTab] = useState<"design" | "code">("design");
  const [codes, setCodes] = useState<PublishingCode>(() =>
    createPublishingCode(""),
  );
  const [copyModes, setCopyModes] = useState<
    Record<PublishingTarget, "original" | "single-line">
  >({
    css: "original",
    html5: "original",
    react: "original",
    astro: "original",
    svelte: "original",
  });
  const [copiedTarget, setCopiedTarget] = useState<PublishingTarget | null>(
    null,
  );
  const [expandedCodeSections, setExpandedCodeSections] = useState<
    Record<PublishingTarget, boolean>
  >({
    css: false,
    html5: false,
    react: false,
    astro: false,
    svelte: false,
  });
  const isImage =
    selectedLayer?.kind === "image" || selectedLayer?.kind === "clipboard";
  const isText =
    selectedLayer?.kind === "text" || selectedLayer?.kind === "button";
  const isIcon = selectedLayer?.kind === "icon";
  const isOption =
    selectedLayer?.kind === "checkbox" || selectedLayer?.kind === "radio";
  const iconInstances =
    selectedLayer?.iconType === "svg"
      ? Object.keys(svgIcons)
      : selectedLayer?.iconType === "mui"
        ? Object.keys(muiIcons)
        : [];
  const optionCount = Math.max(1, selectedLayer?.optionCount ?? 1);
  const optionItems = Array.from({ length: optionCount }, (_, index) =>
    selectedLayer?.optionItems?.[index]
      ? selectedLayer.optionItems[index]
      : { display: `Option ${index + 1}`, value: "Option" },
  );
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
  useEffect(() => {
    if (tab !== "code") return;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      const source = captureCanvasSource();
      void fetch("/api/format-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(source),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("코드 포맷에 실패했습니다.");
          return (await response.json()) as { codes: PublishingCode };
        })
        .then(({ codes: formattedCodes }) => {
          if (!cancelled) setCodes(formattedCodes);
        })
        .catch(() => {
          if (!cancelled)
            setCodes(
              createPublishingCode(
                source.markup,
                source.css,
                source.reactMarkup,
              ),
            );
        });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [tab]);

  const singleLine = (code: string) =>
    code
      .split("\n")
      .map((line) => line.trim())
      .join("");
  const copyCode = async (target: PublishingTarget) => {
    const code =
      copyModes[target] === "single-line"
        ? singleLine(codes[target])
        : codes[target];
    await navigator.clipboard.writeText(code);
    setCopiedTarget(target);
    window.setTimeout(() => setCopiedTarget(null), 1200);
  };
  const codeSections: { target: PublishingTarget; label: string }[] = [
    { target: "css", label: "CSS" },
    { target: "html5", label: "HTML5" },
    { target: "react", label: "React" },
    { target: "astro", label: "Astro" },
    { target: "svelte", label: "Svelte" },
  ];
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
          {(selectedLayer?.kind === "text" ||
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
          {isIcon && (
            <Property title="컴포넌트 속성">
              <label className="component-option">
                <span>Type</span>
                <select
                  value={selectedLayer.iconType ?? ""}
                  onChange={(event) =>
                    onIconProperties({
                      iconType: event.target.value as Layer["iconType"],
                      iconInstance: "",
                      iconSize: selectedLayer.iconSize,
                      iconColor: selectedLayer.iconColor,
                    })
                  }
                >
                  <option value="">선택 안 함</option>
                  <option value="svg">SVG Icon</option>
                  <option value="mui">Mui Icon</option>
                </select>
              </label>
              <label className="component-option">
                <span>Icon instance</span>
                <select
                  value={selectedLayer.iconInstance ?? ""}
                  disabled={!selectedLayer.iconType}
                  onChange={(event) =>
                    onIconProperties({
                      iconType: selectedLayer.iconType,
                      iconInstance: event.target.value,
                      iconSize: selectedLayer.iconSize,
                      iconColor: selectedLayer.iconColor,
                    })
                  }
                >
                  <option value="">아이콘 선택</option>
                  {iconInstances.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="component-option">
                <span>Size</span>
                <input
                  type="number"
                  min="1"
                  value={selectedLayer.iconSize ?? 22}
                  onChange={(event) =>
                    onIconProperties({
                      iconType: selectedLayer.iconType,
                      iconInstance: selectedLayer.iconInstance,
                      iconSize: Math.max(1, Number(event.target.value)),
                      iconColor: selectedLayer.iconColor,
                    })
                  }
                />
              </label>
              <label className="component-option">
                <span>Color</span>
                <span className="component-color-control">
                  <input
                    type="color"
                    value={selectedLayer.iconColor ?? "#6545e8"}
                    onChange={(event) =>
                      onIconProperties({
                        iconType: selectedLayer.iconType,
                        iconInstance: selectedLayer.iconInstance,
                        iconSize: selectedLayer.iconSize,
                        iconColor: event.target.value,
                      })
                    }
                  />
                  <span>{selectedLayer.iconColor ?? "#6545e8"}</span>
                </span>
              </label>
            </Property>
          )}
          {isOption && (
            <Property title="컴포넌트 속성">
              <label className="component-option">
                <span>Option count</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={selectedLayer.optionCount ?? 1}
                  onChange={(event) =>
                    onOptionProperties({
                      optionLabel: selectedLayer.optionLabel,
                      optionCount: Math.max(
                        1,
                        Math.min(20, Number(event.target.value)),
                      ),
                      optionOrientation: selectedLayer.optionOrientation,
                      optionItems: Array.from(
                        {
                          length: Math.max(
                            1,
                            Math.min(20, Number(event.target.value)),
                          ),
                        },
                        (_, index) =>
                          optionItems[index] ?? {
                            display: `Option ${index + 1}`,
                            value: "Option",
                          },
                      ),
                    })
                  }
                />
              </label>
              <label className="component-option">
                <span>Direction</span>
                <select
                  value={selectedLayer.optionOrientation ?? "horizontal"}
                  onChange={(event) =>
                    onOptionProperties({
                      optionLabel: selectedLayer.optionLabel,
                      optionCount: selectedLayer.optionCount,
                      optionOrientation: event.target
                        .value as Layer["optionOrientation"],
                      optionItems,
                    })
                  }
                >
                  <option value="horizontal">수평</option>
                  <option value="vertical">수직</option>
                </select>
              </label>
              <div className="option-editor">
                <div className="option-editor-head">
                  <span>No</span>
                  <span>Display</span>
                  <span>Value</span>
                </div>
                {optionItems.map((option, index) => (
                  <div className="option-editor-row" key={index}>
                    <span>{index + 1}</span>
                    <input
                      type="text"
                      value={option.display}
                      onChange={(event) => {
                        const nextOptions = optionItems.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, display: event.target.value }
                              : item,
                        );
                        onOptionProperties({
                          optionLabel: selectedLayer.optionLabel,
                          optionCount,
                          optionOrientation: selectedLayer.optionOrientation,
                          optionItems: nextOptions,
                        });
                      }}
                    />
                    <input
                      type="text"
                      value={option.value}
                      onChange={(event) => {
                        const nextOptions = optionItems.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, value: event.target.value }
                              : item,
                        );
                        onOptionProperties({
                          optionLabel: selectedLayer.optionLabel,
                          optionCount,
                          optionOrientation: selectedLayer.optionOrientation,
                          optionItems: nextOptions,
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
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
          <div className="code-panel-scroll">
            {codeSections.map(({ target, label }) => (
              <section className="code-section" key={target}>
                <div className="code-head">
                  <button
                    type="button"
                    className="code-section-toggle"
                    aria-expanded={expandedCodeSections[target]}
                    onClick={() =>
                      setExpandedCodeSections((current) => ({
                        ...current,
                        [target]: !current[target],
                      }))
                    }
                  >
                    <Icon
                      name={expandedCodeSections[target] ? "down" : "chevron"}
                      size={12}
                    />
                    <strong>{label}</strong>
                  </button>
                  <div className="code-actions">
                    <div className="copy-mode-toggle">
                      <button
                        className={
                          copyModes[target] === "original" ? "active" : ""
                        }
                        onClick={() =>
                          setCopyModes((current) => ({
                            ...current,
                            [target]: "original",
                          }))
                        }
                      >
                        원본
                      </button>
                      <button
                        className={
                          copyModes[target] === "single-line" ? "active" : ""
                        }
                        onClick={() =>
                          setCopyModes((current) => ({
                            ...current,
                            [target]: "single-line",
                          }))
                        }
                      >
                        한 줄
                      </button>
                    </div>
                    <button
                      className="copy-code-button"
                      onClick={() => void copyCode(target)}
                    >
                      {copiedTarget === target ? "복사됨" : "복사"}
                    </button>
                  </div>
                </div>
                {expandedCodeSections[target] && (
                  <textarea
                    className="code-textarea"
                    value={
                      copyModes[target] === "single-line"
                        ? singleLine(codes[target])
                        : codes[target]
                    }
                    readOnly
                    spellCheck={false}
                    aria-label={`${label} 생성 코드`}
                  />
                )}
              </section>
            ))}
          </div>
          <div className="code-note">
            코드 탭을 열 때 현재 캔버스의 화면과 스타일을 캡처합니다.
          </div>
        </div>
      )}
    </aside>
  );
}
