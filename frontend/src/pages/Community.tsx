import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import Screen from '../components/Screen'
import { useToast } from '../components/Toast'
import { HeartIcon, PlusIcon } from '../components/icons'
import { boardLabel, shortDate } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { AsyncState, UnderlineTabs } from '../components/ui'
import type { Board, Post } from '../types'

type Tab = '인기' | '코스공유' | '모범라이더'

const TABS: { value: Tab; label: string }[] = [
  { value: '인기', label: '인기' },
  { value: '코스공유', label: '코스 공유' },
  { value: '모범라이더', label: '모범 라이더' },
]

export default function Community() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [tab, setTab] = useState<Tab>('인기')
  // 이미 누른 글은 하트를 채워 보여준다 (로컬 상태 — 데모라 서버에 좋아요 소유자를 남기지 않는다).
  const [liked, setLiked] = useState<Set<number>>(new Set())

  // '인기' 탭은 board 없이 요청하면 백엔드가 좋아요순으로 정렬해준다.
  const { data, loading, error, reload, setData } = useAsync(
    () => api.posts(tab === '인기' ? undefined : (tab as Board)),
    [tab],
  )

  const like = async (post: Post) => {
    try {
      const updated = await api.likePost(post.id)
      setData((data ?? []).map((p) => (p.id === updated.id ? updated : p)))
      setLiked((prev) => new Set(prev).add(post.id))
    } catch (err) {
      showToast(err instanceof Error ? err.message : '좋아요에 실패했습니다.', 'error')
    }
  }

  return (
    <Screen title="타슈 커뮤니티" tabBar>
      <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} />

      <div className="mt-4">
        {(loading || error) && <AsyncState loading={loading} error={error} onRetry={reload} />}
        {!loading && !error && data?.length === 0 && (
          <AsyncState empty="아직 게시글이 없어요. 첫 글을 남겨보세요!" />
        )}

        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 xl:grid-cols-3">
          {(data ?? []).map((post) => (
            <article key={post.id} className="card flex gap-3.5 p-4">
              {/* 썸네일 placeholder */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-cream text-[11px] font-bold text-navy/35">
                {boardLabel(post.board).slice(0, 2)}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[14px] font-bold">{post.title}</h3>
                <p className="mt-1 line-clamp-2 text-[12px] text-navy/50">{post.content}</p>
                <p className="mt-2 text-[11px] text-navy/40">
                  {boardLabel(post.board)} · {post.author} · {shortDate(post.created_at)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => like(post)}
                aria-label={`${post.title} 좋아요`}
                className={`flex shrink-0 flex-col items-center gap-0.5 self-center px-1 ${
                  liked.has(post.id) ? 'text-warn' : 'text-navy/35'
                } active:scale-90`}
              >
                <HeartIcon className="h-[18px] w-[18px]" filled={liked.has(post.id)} />
                <span className="text-[11px] font-bold">{post.likes}</span>
              </button>
            </article>
          ))}
        </div>
      </div>

      {/* 글쓰기 FAB — 390px 프레임이 화면 중앙이므로 중앙 기준 오프셋으로 우측 하단에 붙인다. */}
      <button
        type="button"
        onClick={() => navigate('/write')}
        aria-label="글쓰기"
        className="fixed bottom-[92px] left-1/2 z-30 ml-[119px] flex h-14 w-14 flex-col items-center justify-center rounded-full bg-orange text-white shadow-float active:scale-95 lg:bottom-8 lg:left-auto lg:right-8 lg:ml-0"
      >
        <PlusIcon className="h-5 w-5" />
        <span className="text-[9px] font-bold">글쓰기</span>
      </button>
    </Screen>
  )
}
