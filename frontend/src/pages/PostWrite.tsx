import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import Screen from '../components/Screen'
import { useToast } from '../components/Toast'
import { CameraIcon, PinIcon, RouteIcon } from '../components/icons'
import { BOARDS, boardLabel } from '../lib/format'
import { InfoBar } from '../components/ui'
import type { Board } from '../types'

const MAX_CONTENT = 1000

export default function PostWrite() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [board, setBoard] = useState<Board>('코스공유')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = title.trim().length > 0 && !submitting

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await api.createPost({ board, title: title.trim(), content: content.trim() })
      showToast('게시글이 등록되었습니다.', 'success')
      // 목록으로 돌아가면 새 글이 보인다.
      navigate('/community')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '게시글 등록에 실패했습니다.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // PLACEHOLDER: 첨부는 UI 데모. 실제 업로드/좌표 선택 연동 시 교체 예정.
  const toggleAttachment = (label: string) =>
    setAttachments((prev) =>
      prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label],
    )

  return (
    <Screen
      title="글쓰기"
      backIcon="close"
      action={
        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className="text-[14px] font-bold text-orange disabled:text-navy/25"
        >
          등록
        </button>
      }
      footer={
        <button type="button" disabled={!canSubmit} onClick={submit} className="cta">
          {submitting ? '게시 중…' : '게시하기'}
        </button>
      }
    >
      {/* 게시판 선택 */}
      <h2 className="mb-2.5 text-[13px] font-bold">게시판 선택</h2>
      <div className="flex flex-wrap gap-2">
        {BOARDS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBoard(b)}
            className={`chip ${board === b ? 'chip-active' : ''}`}
          >
            {boardLabel(b)}
          </button>
        ))}
      </div>

      {/* 제목 */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 200))}
        placeholder="제목을 입력하세요"
        aria-label="제목"
        className="mt-5 h-[50px] w-full rounded-card bg-white px-4 text-[14px] font-medium shadow-card outline-none placeholder:text-navy/35"
      />

      {/* 본문 + 글자수 */}
      <div className="relative mt-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
          placeholder="내용을 입력하세요"
          aria-label="내용"
          className="h-[240px] w-full resize-none rounded-card bg-white p-4 pb-9 text-[14px] leading-relaxed shadow-card outline-none placeholder:text-navy/35"
        />
        <span className="absolute bottom-3.5 left-4 text-[11px] text-navy/40">
          {content.length.toLocaleString('ko-KR')} / {MAX_CONTENT.toLocaleString('ko-KR')}
        </span>
      </div>

      {/* 첨부 */}
      <div className="mt-4 flex gap-2">
        {[
          { label: '사진', Icon: CameraIcon },
          { label: '위치', Icon: PinIcon },
          { label: '코스', Icon: RouteIcon },
        ].map(({ label, Icon }) => {
          const on = attachments.includes(label)
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggleAttachment(label)}
              className={`flex h-[72px] flex-1 flex-col items-center justify-center gap-1.5 rounded-card border border-dashed transition-colors ${
                on
                  ? 'border-orange bg-orange/10 text-orange'
                  : 'border-navy/20 bg-white text-navy/45'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="text-[12px] font-medium">+ {label}</span>
            </button>
          )
        })}
      </div>
      {attachments.length > 0 && (
        <p className="mt-2 text-[11px] text-navy/45">첨부 예정: {attachments.join(', ')} (UI 데모)</p>
      )}

      <div className="mt-5">
        <InfoBar>욕설·광고 게시글은 사전 안내 없이 삭제될 수 있어요</InfoBar>
      </div>
    </Screen>
  )
}
