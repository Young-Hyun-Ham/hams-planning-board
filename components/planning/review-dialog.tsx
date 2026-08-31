"use client";

import { FormEvent, useState } from "react";

export type ReviewDialogAction = "save" | "request" | "reject" | "complete";

type Props = {
  open: boolean;
  action: ReviewDialogAction;
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: { reviewerEmail: string; message: string }) => void;
};

const labels = {
  save: {
    title: "설계서 저장",
    description: "현재 설계 내용을 저장하시겠습니까?",
    submit: "저장",
  },
  request: {
    title: "검토 요청",
    description: "검토 대상자의 로그인 이메일을 입력하세요.",
    submit: "검토 요청",
  },
  reject: {
    title: "설계서 반려",
    description: "수정이 필요한 내용을 작성하면 소유자에게 전달됩니다.",
    submit: "반려",
  },
  complete: {
    title: "설계서 완료",
    description: "확인 결과 또는 완료 내용을 작성해주세요.",
    submit: "완료",
  },
} as const;

export function ReviewDialog({
  open,
  action,
  loading,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [message, setMessage] = useState("");

  if (!open) return null;
  const label = labels[action];
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ reviewerEmail: reviewerEmail.trim(), message: message.trim() });
  };

  return (
    <div className="review-dialog-backdrop" role="presentation">
      <section
        className="review-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-dialog-title"
      >
        <header>
          <div>
            <h2 id="review-dialog-title">{label.title}</h2>
            <p>{label.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="닫기"
          >
            ×
          </button>
        </header>
        <form onSubmit={submit}>
          {action === "request" && (
            <label>
              <span>검토자 이메일</span>
              <input
                type="email"
                required
                autoFocus
                value={reviewerEmail}
                onChange={(event) => setReviewerEmail(event.target.value)}
                placeholder="reviewer@example.com"
              />
            </label>
          )}
          {action !== "save" && (
            <label>
              <span>
                {action === "request" ? "요청 메시지 (선택)" : "처리 내용"}
              </span>
              <textarea
                required={action !== "request"}
                maxLength={2000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={
                  action === "reject"
                    ? "수정이 필요한 내용을 입력하세요."
                    : "검토 내용을 입력하세요."
                }
              />
            </label>
          )}
          {error && <p className="review-dialog-error">{error}</p>}
          <footer>
            <button type="button" onClick={onClose} disabled={loading}>
              취소
            </button>
            <button
              className={`review-dialog-submit ${action}`}
              type="submit"
              disabled={loading}
            >
              {loading ? "처리 중..." : label.submit}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
