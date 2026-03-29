const {
  clubs,
  posts,
  userProfile,
  initialChats,
  aiReplies,
  clubListCategories,
  searchSuggestions,
} = window.ClubMatchData;

const state = {
  tab: "match",
  clubIndex: 0,
  feedSegment: "all",
  feedFilter: "all",
  /** 从社团列表返回社团详情时用 */
  clubListReturnClubId: null,
  /** 从社团单流列表点进详情时，返回目标 */
  clubDetailReturn: null,
  /** @type {null | { kind: 'club', clubId: string } | { kind: 'post', postId: string } | { kind: 'clubFeed', scope: string, category: string }} */
  fullView: null,
  applications: [
    { clubId: "c3", clubName: "吉他社", status: "待面试", progress: 60 },
  ],
  chats:
    typeof structuredClone === "function"
      ? structuredClone(initialChats)
      : JSON.parse(JSON.stringify(initialChats)),
  favorites: new Set(),
  /** 发现页关键词搜索；非空时 Feed 仅展示匹配帖子 */
  feedSearchQuery: "",
};

const els = {
  main: document.getElementById("main-view"),
  modal: document.getElementById("modal-root"),
  toast: document.getElementById("toast"),
};

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function openModal(html) {
  els.modal.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal-sheet">${html}</div>
    </div>`;
  const backdrop = els.modal.querySelector(".modal-backdrop");
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
  els.modal.querySelector(".modal-close")?.addEventListener("click", closeModal);
}

function closeModal() {
  els.modal.innerHTML = "";
}

function closeFullView() {
  state.fullView = null;
  state.clubListReturnClubId = null;
  state.clubDetailReturn = null;
  render();
}

function matchDeckClubs() {
  return clubs.filter((c) => !c.listOnly);
}

function openFullClub(clubId) {
  state.clubDetailReturn = null;
  state.fullView = { kind: "club", clubId };
  render();
}

/** 社团广场单流列表内点进详情，返回时回到列表 */
function openClubFromFeedList(clubId) {
  const fv = state.fullView;
  if (fv?.kind === "clubFeed") {
    state.clubDetailReturn = { kind: "clubFeed", scope: fv.scope, category: fv.category };
  } else {
    state.clubDetailReturn = null;
  }
  state.fullView = { kind: "club", clubId };
  render();
}

function openClubListFromDetail(clubId) {
  state.clubListReturnClubId = clubId;
  state.clubDetailReturn = null;
  state.fullView = { kind: "clubFeed", scope: "school", category: "all" };
  render();
}

/** 匹配页入口：进入社团广场列表，返回时回到匹配 Tab */
function openClubListFromMatch() {
  state.clubListReturnClubId = null;
  state.clubDetailReturn = null;
  state.fullView = { kind: "clubFeed", scope: "school", category: "all" };
  render();
}

function openFullPost(postId) {
  state.fullView = { kind: "post", postId };
  render();
}

function generateCoverLetter(club) {
  const r = userProfile.resume;
  return `尊敬的 ${club.name} 招新组：

我是${userProfile.name}。

【关于我】${r.about}
【兴趣】${r.interest}
【技能】${r.skills}
【期待】${r.expectation}
【可投入时间】${r.time}

了解到贵社「${club.recruitNeed}」的期待，我希望结合${userProfile.tags.slice(0, 2).join("、")}等积累参与学习与协作。

期待有机会面谈，感谢阅读。

此致
敬礼
${userProfile.name}`;
}

function topClub() {
  const deck = matchDeckClubs();
  return deck[state.clubIndex] ?? null;
}

function postsForClub(clubId) {
  return posts.filter((p) => p.linkedClubId === clubId);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applyModal(club) {
  const text = generateCoverLetter(club);
  return `
    <button type="button" class="modal-close" aria-label="关闭">×</button>
    <h2>AI 自荐信确认</h2>
    <p style="margin:0;font-size:.8rem;color:var(--muted)">由你的 Profile + 社团招新说明拼接生成（演示）。可微调后发送。</p>
    <textarea class="apply-text" id="apply-text">${escapeHtml(text)}</textarea>
    <button type="button" class="btn-primary" id="btn-send-apply">确认发送</button>
    <button type="button" class="btn-secondary" id="btn-cancel-apply">取消</button>
  `;
}

function wireApplyModal(club) {
  document.querySelector(".modal-close")?.addEventListener("click", closeModal);
  document.getElementById("btn-cancel-apply")?.addEventListener("click", closeModal);
  document.getElementById("btn-send-apply")?.addEventListener("click", () => {
    const ta = document.getElementById("apply-text");
    finalizeApply(club, ta?.value ?? "");
  });
}

function openApplyModal(club) {
  openModal(applyModal(club));
  wireApplyModal(club);
}

function renderClubFullPage(club) {
  const related = postsForClub(club.id);
  const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);

  return `
    <div class="full-page club-score-page">
      <div class="full-page-nav club-nav-bar">
        <button type="button" class="nav-back" id="full-back">‹ 返回</button>
        <span class="club-nav-title" aria-hidden="true">${club.name}</span>
        <button type="button" class="nav-text-btn" id="club-open-list">列表</button>
      </div>
      <div class="full-hero" style="background:${club.gradient}">
        <div class="full-hero-inner">
          <h1 class="full-title">${club.name}</h1>
          <div class="full-score-row">
            <span class="score-big">${club.vibeScore}</span><span class="score-denom">/ 5</span>
            <span class="workload-pill">任务量：${club.workload}</span>
          </div>
          <div class="club-tags" style="margin-top:10px">
            ${club.tags.map((t) => `<span class="pill">${t}</span>`).join("")}
          </div>
          <p class="full-blurb">${club.blurb}</p>
          <div class="keyword-row" style="margin-top:8px">
            ${club.summaryKeywords.map((k) => `<span class="keyword" style="background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.35);color:#fff">${k}</span>`).join("")}
          </div>
        </div>
      </div>
      <div class="full-body">
        <section class="full-section">
          <h2 class="full-section-title">学长学姐真实评分与评论</h2>
          <p class="full-section-desc">以下为往届成员匿名反馈（演示数据）。</p>
          <div class="review-list">
            ${club.reviews
              .map(
                (rv) => `
              <div class="review-card">
                <div class="review-head">
                  <span class="review-who">${rv.nickname} · ${rv.cohort}</span>
                  <span class="review-stars" aria-label="${rv.stars} 星">${stars(rv.stars)}</span>
                </div>
                <p class="review-text">${rv.text}</p>
                <div class="review-tags">${rv.tags.map((t) => `<span class="mini-tag">${t}</span>`).join("")}</div>
              </div>`
              )
              .join("")}
          </div>
        </section>

        <section class="full-section">
          <h2 class="full-section-title">带本社话题的动态</h2>
          <div class="related-post-list">
            ${
              related.length
                ? related
                    .map(
                      (p) => `
              <button type="button" class="related-post-row" data-post-id="${p.id}">
                <span class="related-post-tag">${p.tag}</span>
                <span class="related-post-title">${p.title}</span>
                <span class="related-post-meta">${p.author}</span>
              </button>`
                    )
                    .join("")
                : `<p class="full-section-desc">暂无关联帖子（演示）。</p>`
            }
          </div>
        </section>

        <section class="full-section">
          <h2 class="full-section-title">活动影像</h2>
          <div class="gallery-scroll" role="list">
            ${club.gallery
              .map(
                (g, i) => `
            <div class="gallery-tile" style="background:${g}" role="listitem" aria-label="活动图 ${i + 1}"></div>`
              )
              .join("")}
          </div>
        </section>

        <button type="button" class="btn-primary" id="club-apply">感兴趣 · 一键投递</button>
      </div>
    </div>`;
}

function attachClubFullPage(club) {
  document.getElementById("full-back")?.addEventListener("click", () => {
    if (state.clubDetailReturn?.kind === "clubFeed") {
      const r = state.clubDetailReturn;
      state.clubDetailReturn = null;
      state.fullView = { kind: "clubFeed", scope: r.scope, category: r.category };
      render();
      return;
    }
    if (state.clubListReturnClubId) {
      const id = state.clubListReturnClubId;
      state.clubListReturnClubId = null;
      state.fullView = { kind: "club", clubId: id };
      render();
      return;
    }
    closeFullView();
  });
  document.getElementById("club-open-list")?.addEventListener("click", () => openClubListFromDetail(club.id));
  document.getElementById("club-apply")?.addEventListener("click", () => openApplyModal(club));
  document.querySelectorAll(".related-post-row[data-post-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-post-id");
      if (id) openFullPost(id);
    });
  });
}

const postDemoComments = [
  { who: "路过的同学", text: "求位置！还在现场吗？" },
  { who: "社恐本人", text: "围观需要报名吗？" },
];

function renderPostFullPage(post) {
  const club = post.linkedClubId ? clubs.find((c) => c.id === post.linkedClubId) : null;
  return `
    <div class="full-page post-detail-page">
      <div class="full-page-nav">
        <button type="button" class="nav-back" id="post-full-back">‹ 返回</button>
      </div>
      <article class="post-full">
        <span class="post-full-badge">${post.tag}</span>
        <h1 class="post-full-title">${post.title}</h1>
        <p class="post-full-meta">${post.author} · ${post.distanceText}</p>
        <p class="post-full-body">${post.body}</p>
        ${
          club
            ? `<button type="button" class="btn-outline-club" id="post-goto-club" data-club-id="${club.id}">查看关联社团：${club.name}</button>`
            : ""
        }
        <section class="post-comments">
          <h2 class="full-section-title">评论（演示）</h2>
          ${postDemoComments
            .map(
              (c) => `
            <div class="comment-row">
              <strong>${c.who}</strong>
              <p>${c.text}</p>
            </div>`
            )
            .join("")}
        </section>
      </article>
    </div>`;
}

function attachPostFullPage(post) {
  document.getElementById("post-full-back")?.addEventListener("click", closeFullView);
  document.getElementById("post-goto-club")?.addEventListener("click", (e) => {
    const id = e.currentTarget.getAttribute("data-club-id");
    if (id) openFullClub(id);
  });
}

function filterClubsForList(scope, category) {
  let list = clubs.filter((c) => {
    if (scope === "school") return c.tier === "school";
    if (scope === "city") return c.tier === "school" || c.tier === "city";
    return true;
  });
  if (category && category !== "all") list = list.filter((c) => c.listCategory === category);
  return list;
}

function tierBadgeHtml(tier) {
  if (tier === "school") return '<span class="cf-tier is-school">本校</span>';
  if (tier === "city") return '<span class="cf-tier is-city">同城</span>';
  return '<span class="cf-tier is-nation">全国</span>';
}

function renderClubFeedPage() {
  const fv = state.fullView;
  if (fv?.kind !== "clubFeed") return "";
  const { scope, category } = fv;
  const list = filterClubsForList(scope, category);

  const rail = clubListCategories
    .map(
      (cat) => `
    <button type="button" class="cat-rail-btn ${category === cat.id ? "is-on" : ""}" data-cat="${cat.id}">${cat.label}</button>`
    )
    .join("");

  const scopeBtn = (s) =>
    `<button type="button" class="scope-chip ${scope === s ? "is-on" : ""}" data-scope="${s}">${s === "school" ? "本校" : s === "city" ? "全市" : "全国"}</button>`;

  const items = list
    .map(
      (c) => `
    <button type="button" class="club-feed-item" data-club-id="${c.id}">
      <div class="cf-thumb" style="background:${c.gradient}"></div>
      <div class="cf-body">
        <div class="cf-head">
          ${tierBadgeHtml(c.tier)}
          <span class="cf-score">${c.vibeScore} 分</span>
        </div>
        <h3 class="cf-name">${c.name}</h3>
        <p class="cf-blurb">${c.blurb}</p>
        <div class="cf-tags">${c.tags.map((t) => `<span class="cf-tag">${t}</span>`).join("")}</div>
        <div class="cf-foot"><span>任务量 ${c.workload}</span></div>
      </div>
    </button>`
    )
    .join("");

  return `
    <div class="full-page club-feed-page">
      <div class="club-feed-topbar">
        <button type="button" class="nav-back" id="club-feed-back">‹ 返回</button>
        <div class="scope-seg" role="group" aria-label="范围">
          ${scopeBtn("school")}${scopeBtn("city")}${scopeBtn("nation")}
        </div>
      </div>
      <p class="club-feed-page-title">社团广场</p>
      <div class="club-feed-layout">
        <aside class="cat-rail" aria-label="分类">${rail}</aside>
        <div class="club-feed-stream">
          ${list.length ? items : `<p class="club-feed-empty">该范围与分类下暂无社团（演示）。</p>`}
        </div>
      </div>
    </div>`;
}

function attachClubFeedPage() {
  document.getElementById("club-feed-back")?.addEventListener("click", () => {
    if (state.clubListReturnClubId) {
      const id = state.clubListReturnClubId;
      state.clubListReturnClubId = null;
      state.fullView = { kind: "club", clubId: id };
      render();
      return;
    }
    closeFullView();
  });
  document.querySelectorAll(".scope-seg [data-scope]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = btn.getAttribute("data-scope");
      if (state.fullView?.kind === "clubFeed" && s) {
        state.fullView.scope = s;
        render();
      }
    });
  });
  document.querySelectorAll(".cat-rail-btn[data-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const c = btn.getAttribute("data-cat");
      if (state.fullView?.kind === "clubFeed" && c) {
        state.fullView.category = c;
        render();
      }
    });
  });
  document.querySelectorAll(".club-feed-item[data-club-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-club-id");
      if (id) openClubFromFeedList(id);
    });
  });
}

function closeSearchOverlay() {
  els.modal.innerHTML = "";
}

/** 社团：名称、简介、标签、关键词、招新要求、匹配理由、评价正文等 */
function clubMatchesQuery(c, qLower) {
  if (!qLower) return false;
  const parts = [
    c.name,
    c.blurb,
    c.matchReason,
    c.recruitNeed,
    c.workload,
    String(c.vibeScore),
    ...(c.tags || []),
    ...(c.summaryKeywords || []),
  ];
  if (Array.isArray(c.reviews)) {
    for (const r of c.reviews) {
      parts.push(r.nickname, r.text, ...(r.tags || []));
    }
  }
  return parts.some((p) => String(p).toLowerCase().includes(qLower));
}

/** 帖子：标题、正文、作者、标签、分类等；关联社团命中关键词也算匹配 */
function postMatchesQuery(p, qLower) {
  if (!qLower) return false;
  const parts = [p.title, p.body, p.author, p.tag, p.category, p.distanceText].map(String);
  if (parts.some((x) => x.toLowerCase().includes(qLower))) return true;
  if (p.linkedClubId) {
    const c = clubs.find((x) => x.id === p.linkedClubId);
    if (c && clubMatchesQuery(c, qLower)) return true;
  }
  return false;
}

function postsMatchingKeyword(qLower) {
  return posts.filter((p) => postMatchesQuery(p, qLower));
}

function switchToFeedTab() {
  state.tab = "feed";
  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.tab === "feed");
    if (b.dataset.tab === "feed") b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
}

/** 应用搜索并回到发现页，Feed 展示匹配帖子 */
function applyFeedSearch(raw) {
  state.feedSearchQuery = (raw ?? "").trim();
  switchToFeedTab();
  closeSearchOverlay();
  render();
}

function clearFeedSearch() {
  state.feedSearchQuery = "";
  render();
}

function renderSearchHintListHtml() {
  if (!searchSuggestions.length) {
    return '<p class="search-empty">输入关键词后点「搜索」，结果会显示在发现页下方</p>';
  }
  const lis = searchSuggestions
    .map(
      (s) =>
        `<li><button type="button" class="search-sug-item search-sug-quick" data-quick-search="${escapeHtml(s.text)}">${escapeHtml(s.text)}</button></li>`
    )
    .join("");
  return `<p class="search-hint-label">猜你想搜（点击同样会在 Feed 中筛选帖子）</p><ul class="search-sug-list">${lis}</ul>`;
}

function openSearchOverlay() {
  els.modal.innerHTML = `
    <div class="search-overlay-backdrop" role="dialog" aria-modal="true" aria-label="搜索">
      <div class="search-overlay-panel">
        <div class="search-overlay-top">
          <div class="search-field-wrap">
            <span class="search-glyph" aria-hidden="true">⌕</span>
            <input type="search" class="search-field-input" id="search-input" placeholder="搜索社团、话题、活动…" autocomplete="off" enterkeyhint="search" value="${escapeHtml(state.feedSearchQuery)}" />
          </div>
          <button type="button" class="search-go-btn" id="search-submit">搜索</button>
          <button type="button" class="search-cancel-btn" id="search-cancel">取消</button>
        </div>
        <div class="search-overlay-body" id="search-hint-wrap">
          ${renderSearchHintListHtml()}
        </div>
      </div>
    </div>`;

  const backdrop = els.modal.querySelector(".search-overlay-backdrop");
  const input = document.getElementById("search-input");

  function runSearch() {
    applyFeedSearch(input?.value ?? "");
  }

  backdrop?.addEventListener("click", (e) => {
    if (e.target === backdrop) closeSearchOverlay();
  });
  document.getElementById("search-cancel")?.addEventListener("click", closeSearchOverlay);
  document.getElementById("search-submit")?.addEventListener("click", runSearch);

  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch();
    }
  });

  document.querySelectorAll(".search-sug-quick[data-quick-search]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = btn.getAttribute("data-quick-search");
      if (t) applyFeedSearch(t);
    });
  });

  requestAnimationFrame(() => {
    input?.focus();
    try {
      const len = input?.value?.length ?? 0;
      input?.setSelectionRange(len, len);
    } catch (_) {
      /* ignore */
    }
  });
}

function matchPageToolbar() {
  return `
    <div class="match-page-toolbar">
      <span class="panel-title match-toolbar-title">匹配与发现</span>
      <button type="button" class="match-club-list-btn" id="match-open-club-list" aria-label="打开社团列表">
        <span class="match-club-list-icon" aria-hidden="true">
          <span class="mcli-bar"></span><span class="mcli-bar"></span><span class="mcli-bar"></span>
        </span>
        <span class="match-club-list-text">社团列表</span>
      </button>
    </div>`;
}

function renderMatch() {
  const deck = matchDeckClubs();
  const current = deck[state.clubIndex] ?? null;
  const next = deck[state.clubIndex + 1] ?? null;

  if (!current) {
    return `
      ${matchPageToolbar()}
      <div class="empty-stack">
        <p>本轮卡片已看完。</p>
        <button type="button" id="reset-deck">重新洗牌</button>
      </div>`;
  }

  const nextCard = next
    ? `
    <div class="club-card is-next" aria-hidden="true">
      <div class="club-card-media" style="background:${next.gradient}">
        <div class="club-card-body">
          <h2 class="club-name">${next.name}</h2>
        </div>
      </div>
    </div>`
    : "";

  return `
    ${matchPageToolbar()}
    <div class="match-wrap">
      <div class="card-stack" id="card-stack">
        ${nextCard}
        <div class="club-card is-top" id="active-card" data-id="${current.id}">
          <div class="club-card-media" style="background:${current.gradient}">
            <div class="club-card-body">
              <h2 class="club-name">${current.name}</h2>
              <div class="club-tags">
                ${current.tags.map((t) => `<span class="pill">${t}</span>`).join("")}
              </div>
              <p class="club-blurb" style="margin:0 0 10px;font-size:.85rem;opacity:.92">${current.blurb}</p>
              <div class="ai-bubble">
                <strong>匹配理由：</strong>${current.matchReason}
              </div>
              <p class="tap-hint">点击卡片进入评分与详情页</p>
            </div>
          </div>
        </div>
      </div>
      <div class="match-actions">
        <button type="button" class="action-round danger" id="btn-pass" aria-label="无感">✕</button>
        <button type="button" class="action-round accent" id="btn-fav" aria-label="收藏">♥</button>
      </div>
      <p class="hint-row">左滑无感 · 右滑下一张 · 点击卡片看学长评分与相关动态</p>
    </div>`;
}

function attachMatchHandlers() {
  document.getElementById("match-open-club-list")?.addEventListener("click", openClubListFromMatch);
  document.getElementById("reset-deck")?.addEventListener("click", () => {
    state.clubIndex = 0;
    render();
  });

  const advance = () => {
    state.clubIndex += 1;
    render();
  };

  document.getElementById("btn-pass")?.addEventListener("click", () => {
    const card = document.getElementById("active-card");
    if (card) {
      card.style.transform = "translateX(-120%) rotate(-12deg)";
      card.style.opacity = "0";
    }
    setTimeout(advance, 280);
  });

  document.getElementById("btn-fav")?.addEventListener("click", () => {
    const c = topClub();
    if (!c) return;
    state.favorites.add(c.id);
    toast(`已收藏「${c.name}」`);
  });

  const stack = document.getElementById("card-stack");
  const card = document.getElementById("active-card");
  if (stack && card) {
    let startX = 0;
    let startY = 0;
    let dragging = false;
    let moved = false;

    const thresholdSwipe = 70;
    const thresholdMove = 14;

    const onEnd = (clientX, clientY) => {
      if (!dragging) return;
      dragging = false;
      const dx = clientX - startX;
      const dy = clientY - startY;

      if (dx < -thresholdSwipe) {
        card.style.transform = "translateX(-120%) rotate(-12deg)";
        card.style.opacity = "0";
        setTimeout(advance, 280);
        return;
      }
      if (dx > thresholdSwipe) {
        card.style.transform = "translateX(120%) rotate(12deg)";
        card.style.opacity = "0";
        setTimeout(advance, 280);
        return;
      }

      card.style.transform = "";
      card.style.opacity = "";

      if (moved === false || (Math.abs(dx) < thresholdMove && Math.abs(dy) < thresholdMove)) {
        const c = topClub();
        if (c) openFullClub(c.id);
      }
      moved = false;
    };

    card.addEventListener("pointerdown", (e) => {
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      card.setPointerCapture(e.pointerId);
    });
    card.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > thresholdMove || Math.abs(dy) > thresholdMove) moved = true;
      if (Math.abs(dx) > 8) card.style.transform = `translateX(${dx}px) rotate(${dx * 0.04}deg)`;
    });
    card.addEventListener("pointerup", (e) => onEnd(e.clientX, e.clientY));
    card.addEventListener("pointercancel", () => {
      dragging = false;
      moved = false;
      card.style.transform = "";
    });
  }
}

function filterPosts() {
  let list = posts;
  if (state.feedSegment === "club") list = list.filter((p) => p.type === "club");
  if (state.feedSegment === "fresh") list = list.filter((p) => p.type === "fresh");
  if (state.feedFilter === "hot") list = list.filter((p) => p.hot);
  if (state.feedFilter === "art") list = list.filter((p) => p.category === "文艺");
  if (state.feedFilter === "tech") list = list.filter((p) => p.category === "技术");
  return list;
}

function renderFeedPostCard(p) {
  return `
        <article class="feed-card" data-post-id="${p.id}" tabindex="0" role="button" aria-label="打开帖子 ${p.title}">
          <div class="thumb"></div>
          <div class="body">
            <div class="meta">
              ${p.tag === "实时动态" ? '<span class="badge-live">快闪</span>' : ""}
              ${p.author} · ${p.distanceText}
            </div>
            <h3>${p.title}</h3>
            <p>${p.body}</p>
            ${
              p.linkedClubId
                ? `<button type="button" class="feed-link" data-club-id="${p.linkedClubId}">关联社团主页 →</button>`
                : ""
            }
          </div>
        </article>`;
}

function renderFeed() {
  const inSearch = Boolean(state.feedSearchQuery);
  const qLower = (state.feedSearchQuery || "").toLowerCase();
  const list = inSearch ? postsMatchingKeyword(qLower) : filterPosts();
  const hot = posts.filter((p) => p.hot);

  const searchEntryLabel = inSearch
    ? `「${state.feedSearchQuery}」`
    : "搜索社团、话题、活动…";

  const toolbarAndHot = inSearch
    ? ""
    : `
    <div class="feed-toolbar">
      <div class="segment" role="group" aria-label="内容类型">
        <button type="button" class="${state.feedSegment === "all" ? "is-on" : ""}" data-seg="all">全部</button>
        <button type="button" class="${state.feedSegment === "club" ? "is-on" : ""}" data-seg="club">社团</button>
        <button type="button" class="${state.feedSegment === "fresh" ? "is-on" : ""}" data-seg="fresh">新生</button>
      </div>
      <button type="button" class="chip ${state.feedFilter === "all" ? "is-on" : ""}" data-filter="all">综合</button>
      <button type="button" class="chip ${state.feedFilter === "hot" ? "is-on" : ""}" data-filter="hot">热度</button>
      <button type="button" class="chip ${state.feedFilter === "art" ? "is-on" : ""}" data-filter="art">文艺</button>
      <button type="button" class="chip ${state.feedFilter === "tech" ? "is-on" : ""}" data-filter="tech">技术</button>
    </div>
    <div class="hot-banner">
      <strong>实时热帖</strong>
      <div class="hot-lines">
        ${hot.map((p) => `<button type="button" class="hot-line" data-post-id="${p.id}">· ${p.title}</button>`).join("")}
      </div>
    </div>`;

  const searchBanner = inSearch
    ? `<div class="feed-search-result-bar">
        <p class="feed-search-result-text">以下为与 <strong>${escapeHtml(state.feedSearchQuery)}</strong> 相关的帖子</p>
        <button type="button" class="feed-search-clear" id="feed-search-clear">清除搜索</button>
      </div>`
    : "";

  const feedBody =
    inSearch && list.length === 0
      ? `<div class="feed-search-empty">未匹配到帖子/社团</div>`
      : `<div class="feed-masonry ${inSearch ? "is-search-mode" : ""}">${list.map((p) => renderFeedPostCard(p)).join("")}</div>`;

  return `
    <p class="panel-title">发现 · Feed</p>
    <button type="button" class="feed-search-entry ${inSearch ? "is-active" : ""}" id="feed-search-open" aria-label="打开搜索">
      <span class="feed-search-icon" aria-hidden="true">⌕</span>
      <span class="feed-search-placeholder">${escapeHtml(searchEntryLabel)}</span>
    </button>
    ${toolbarAndHot}
    ${searchBanner}
    ${feedBody}`;
}

function attachFeedHandlers() {
  document.getElementById("feed-search-open")?.addEventListener("click", openSearchOverlay);
  document.getElementById("feed-search-clear")?.addEventListener("click", clearFeedSearch);
  document.querySelectorAll("[data-seg]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.feedSegment = btn.getAttribute("data-seg");
      render();
    });
  });
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.feedFilter = btn.getAttribute("data-filter");
      render();
    });
  });
  document.querySelectorAll(".hot-line[data-post-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-post-id");
      if (id) openFullPost(id);
    });
  });
  document.querySelectorAll(".feed-card[data-post-id]").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".feed-link")) return;
      const id = card.getAttribute("data-post-id");
      if (id) openFullPost(id);
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!e.target.closest(".feed-link")) {
          const id = card.getAttribute("data-post-id");
          if (id) openFullPost(id);
        }
      }
    });
  });
  document.querySelectorAll(".feed-link[data-club-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-club-id");
      const club = clubs.find((c) => c.id === id);
      if (club) openFullClub(club.id);
    });
  });
}

function renderChatList() {
  return `
    <p class="panel-title">消息</p>
    <div class="chat-list">
      ${state.chats
        .map((c) => {
          const pin = c.pinned ? "pinned" : "";
          const av = c.kind === "ai" ? "ai" : "human";
          const letter = c.kind === "ai" ? "AI" : c.title.charAt(0);
          return `
          <button type="button" class="chat-row ${pin}" data-chat-id="${c.id}">
            <div class="chat-avatar ${av}">${letter}</div>
            <div class="chat-row-body">
              <div class="chat-row-title">${c.title}</div>
              <div class="chat-row-sub">${c.subtitle}</div>
              <div class="chat-row-last">${c.last}</div>
            </div>
          </button>`;
        })
        .join("")}
    </div>`;
}

let threadState = { id: null, messages: [] };

function openChatThread(chat) {
  if (chat.kind === "ai") {
    threadState = {
      id: chat.id,
      messages: [
        { role: "them", text: "你好，我是招新小助手。可以问：哪个社团不卷？想学 Python 去哪？" },
      ],
    };
  } else {
    threadState = {
      id: chat.id,
      messages: [{ role: "them", text: chat.last }],
    };
  }

  const threadHtml = `
    <div class="chat-thread">
      <div class="thread-head">
        <button type="button" class="thread-back" id="thread-back" aria-label="返回">‹</button>
        <div>
          <div style="font-weight:600">${chat.title}</div>
          <div style="font-size:.7rem;color:var(--muted)">${chat.subtitle}</div>
        </div>
      </div>
      <div class="thread-messages" id="thread-messages"></div>
      <form class="thread-input" id="thread-form">
        <input type="text" id="thread-input" placeholder="输入消息…" autocomplete="off" />
        <button type="submit">发送</button>
      </form>
    </div>`;
  els.modal.innerHTML = threadHtml;

  function paintMessages() {
    const box = document.getElementById("thread-messages");
    if (!box) return;
    box.innerHTML = threadState.messages
      .map((m) => `<div class="msg ${m.role === "me" ? "me" : "them"}">${m.text}</div>`)
      .join("");
    box.scrollTop = box.scrollHeight;
  }

  paintMessages();

  document.getElementById("thread-back")?.addEventListener("click", () => {
    els.modal.innerHTML = "";
  });

  document.getElementById("thread-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("thread-input");
    const v = (input?.value ?? "").trim();
    if (!v) return;
    threadState.messages.push({ role: "me", text: v });
    input.value = "";
    paintMessages();

    if (threadState.id === "ai") {
      setTimeout(() => {
        const reply = aiReplies[Math.floor(Math.random() * aiReplies.length)];
        threadState.messages.push({ role: "them", text: reply });
        const row = state.chats.find((x) => x.id === "ai");
        if (row) row.last = reply.slice(0, 36) + "…";
        paintMessages();
      }, 450);
    } else {
      setTimeout(() => {
        threadState.messages.push({ role: "them", text: "收到，我们招新组会尽快回复（演示）。" });
        paintMessages();
      }, 500);
    }
  });
}

function attachChatHandlers() {
  document.querySelectorAll("[data-chat-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-chat-id");
      const chat = state.chats.find((c) => c.id === id);
      if (chat) openChatThread(chat);
    });
  });
}

function renderProfile() {
  const apps = state.applications;
  const r = userProfile.resume;
  return `
    <p class="panel-title">我的</p>
    <div class="profile-header">
      <div class="flip-card" id="flip-card" tabindex="0" role="button" aria-label="翻转名片">
        <div class="flip-card-inner">
          <div class="flip-face flip-front">
            <div class="profile-name">${userProfile.name}</div>
            <div class="profile-tags">
              ${userProfile.tags.map((t) => `<span>${t}</span>`).join("")}
            </div>
            <p class="flip-hint">查看我的另一面</p>
          </div>
          <div class="flip-face flip-back">
            <div class="profile-name" style="color:var(--text);font-size:1.1rem">智能名片</div>
            <p style="margin:6px 0;font-size:.9rem"><strong>MBTI</strong> ${userProfile.mbti}</p>
            <p style="margin:0;font-size:.9rem"><strong>星座</strong> ${userProfile.zodiac}</p>
            <p class="flip-hint" style="color:var(--muted)">再点一次翻回正面</p>
          </div>
        </div>
      </div>
    </div>
    <section class="section">
      <h2>智能简历</h2>
      <div class="resume-box structured">
        <p class="resume-block"><strong>【关于我】</strong><br/>${r.about}</p>
        <p class="resume-block"><strong>【兴趣】</strong><br/>${r.interest}</p>
        <p class="resume-block"><strong>【技能】</strong><br/>${r.skills}</p>
        <p class="resume-block"><strong>【期待】</strong><br/>${r.expectation}</p>
        <p class="resume-block"><strong>【可投入时间】</strong><br/>${r.time}</p>
      </div>
    </section>
    <section class="section">
      <h2>申请记录</h2>
      ${apps
        .map((a) => {
          const ok = a.status === "已录取";
          return `
          <div class="apply-item">
            <div class="apply-top">
              <strong>${a.clubName}</strong>
              <span class="status-pill ${ok ? "ok" : ""}">${a.status}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${a.progress}%"></div>
            </div>
          </div>`;
        })
        .join("")}
    </section>`;
}

function attachProfileHandlers() {
  const flip = document.getElementById("flip-card");
  flip?.addEventListener("click", () => flip.classList.toggle("flipped"));
  flip?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      flip.classList.toggle("flipped");
    }
  });
}

function finalizeApply(club, letter) {
  const exists = state.applications.some((a) => a.clubId === club.id);
  if (!exists) {
    state.applications.unshift({
      clubId: club.id,
      clubName: club.name,
      status: "待面试",
      progress: 35,
    });
  }
  const threadId = `club-${club.id}`;
  if (!state.chats.some((c) => c.id === threadId)) {
    state.chats.splice(1, 0, {
      id: threadId,
      kind: "human",
      title: `${club.name} · 招新组`,
      subtitle: "已通过系统投递",
      last: letter.slice(0, 40) + "…",
      pinned: false,
    });
  } else {
    const row = state.chats.find((c) => c.id === threadId);
    if (row) row.last = "已更新自荐信（演示）";
  }
  const aiRow = state.chats.find((c) => c.id === "ai");
  if (aiRow) aiRow.last = `已协助你向「${club.name}」发送投递。`;
  closeModal();
  toast("已发送，并在消息页开启对话");
  state.tab = "chat";
  state.feedSearchQuery = "";
  state.fullView = null;
  state.clubListReturnClubId = null;
  state.clubDetailReturn = null;
  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.tab === "chat");
    b.toggleAttribute("aria-current", b.dataset.tab === "chat" ? "page" : false);
  });
  render();
}

function render() {
  if (state.fullView?.kind === "clubFeed") {
    els.main.innerHTML = renderClubFeedPage();
    attachClubFeedPage();
    return;
  }

  if (state.fullView?.kind === "club") {
    const club = clubs.find((c) => c.id === state.fullView.clubId);
    if (!club) {
      state.fullView = null;
      render();
      return;
    }
    els.main.innerHTML = renderClubFullPage(club);
    attachClubFullPage(club);
    return;
  }

  if (state.fullView?.kind === "post") {
    const post = posts.find((p) => p.id === state.fullView.postId);
    if (!post) {
      state.fullView = null;
      render();
      return;
    }
    els.main.innerHTML = renderPostFullPage(post);
    attachPostFullPage(post);
    return;
  }

  let html = "";
  if (state.tab === "match") html = renderMatch();
  else if (state.tab === "feed") html = renderFeed();
  else if (state.tab === "chat") html = renderChatList();
  else html = renderProfile();

  els.main.innerHTML = html;

  if (state.tab === "match") attachMatchHandlers();
  else if (state.tab === "feed") attachFeedHandlers();
  else if (state.tab === "chat") attachChatHandlers();
  else attachProfileHandlers();
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const t = btn.dataset.tab;
    if (!t) return;
    state.tab = t;
    if (t !== "feed") state.feedSearchQuery = "";
    state.fullView = null;
    state.clubListReturnClubId = null;
    state.clubDetailReturn = null;
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.tab === t);
      if (b.dataset.tab === t) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    render();
  });
});

render();
