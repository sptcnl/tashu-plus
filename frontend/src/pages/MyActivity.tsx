import { useState } from 'react'
import { api } from '../api'
import Screen from '../components/Screen'
import { TrophyIcon } from '../components/icons'
import { boardLabel, shortDate } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { AsyncState, UnderlineTabs } from '../components/ui'

type Tab = 'posts' | 'comments' | 'likes'

const TABS: { value: Tab; label: string }[] = [
  { value: 'posts', label: '내 글' },
  { value: 'comments', label: '댓글' },
  { value: 'likes', label: '좋아요' },
]

export default function MyActivity() {
  const [tab, setTab] = useState<Tab>('posts')
  const { data, loading, error, reload } = useAsync(() => api.activity(), [])

  return (
    <Screen title="커뮤니티 활동">
      <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} />

      <div className="mt-4">
        {(loading || error) && <AsyncState loading={loading} error={error} onRetry={reload} />}

        {!loading && !error && tab === 'posts' && (
          <div className="space-y-3">
            {data?.posts.length === 0 && <AsyncState empty="작성한 글이 없어요." />}
            {data?.posts.map((post) => (
              <article key={post.id} className="card p-4">
                <h3 className="text-[14px] font-bold">{post.title}</h3>
                <p className="mt-2 text-[11px] text-navy/40">
                  {boardLabel(post.board)} · {shortDate(post.created_at)} · 좋아요 {post.likes}
                </p>
              </article>
            ))}
          </div>
        )}

        {/* PLACEHOLDER: 댓글 모델이 없어 집계 값만 보여준다. */}
        {!loading && !error && tab === 'comments' && (
          <div className="card p-6 text-center">
            <p className="text-[14px] font-bold">작성한 댓글 {data?.total_comments ?? 0}개</p>
            <p className="mt-2 text-[12px] text-navy/45">
              댓글 상세 목록은 다음 버전에서 제공될 예정이에요.
            </p>
          </div>
        )}

        {!loading && !error && tab === 'likes' && (
          <div className="card p-6 text-center">
            <p className="text-[14px] font-bold">받은 좋아요 {data?.total_likes ?? 0}개</p>
            <p className="mt-2 text-[12px] text-navy/45">
              내 글 {data?.total_posts ?? 0}개에 달린 좋아요 합계예요.
            </p>
          </div>
        )}
      </div>

      {/* 랭킹 카드 */}
      {data && (
        <div className="mt-6 card flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange/12 text-orange">
            <TrophyIcon />
          </div>
          <div>
            <p className="text-[14px] font-bold">이번 달 활동 랭킹 {data.ranking}위</p>
            <p className="mt-1 text-[12px] text-navy/50">
              {data.posts_to_badge > 0
                ? `${data.posts_to_badge}건 더 작성하면 모범 라이더 배지 획득!`
                : '모범 라이더 배지를 획득했어요!'}
            </p>
          </div>
        </div>
      )}
    </Screen>
  )
}
