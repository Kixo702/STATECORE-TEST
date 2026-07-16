import { useState, useMemo } from 'react'

const IconSearch = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const IconChevron = ({ open }) => (
  <svg viewBox="0 0 24 24" className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
const IconBook = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </svg>
)
const IconMask = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 4c1.5 4-1 8 1 10-1 1.5-3 2-5 1-1 1-3 1-4 0-2 1-4 .5-5-1 2-2-.5-6 1-10" />
    <circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" />
  </svg>
)
const IconLifebuoy = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" />
    <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" /><line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
    <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" /><line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
  </svg>
)

const CATEGORIES = [
  {
    id: 'rules',
    label: 'Правила РП',
    icon: <IconBook />,
    color: '#f59e0b',
    items: [
      {
        q: 'Что такое NonRP и почему это нарушение?',
        a: 'NonRP — любое поведение, которое разрушает атмосферу отыгрыша: неигровые разговоры в игровом чате, нелогичные с точки зрения персонажа действия, использование игровых знаний вне контекста роли. Простое правило: если твой персонаж не мог бы это знать или сказать в жизни — это NonRP.',
      },
      {
        q: 'Что такое MetaGaming?',
        a: 'Метагейминг — использование информации, полученной вне игры (Discord, стрим, другой персонаж), в игровой ситуации. Например, ты услышал в голосовом чате команды, где прячется грабитель, и твой персонаж «внезапно» об этом узнал — это метагейминг и наказывается.',
      },
      {
        q: 'Чем PowerGaming отличается от обычного РП?',
        a: 'PowerGaming (PG) — попытка навязать другому игроку результат действия без права ответа: например, писать «/me одним ударом вырубает тебя» вместо честного отыгрыша через шансы и /do. Хороший тон — давать оппоненту возможность отыграть реакцию.',
      },
      {
        q: 'В чём разница между RDM, VDM и DM?',
        a: 'RDM (Random Death Match) — убийство персонажа без ролевой причины и повода. VDM (Vehicle Death Match) — то же самое, но с использованием транспорта как оружия. DM (Death Match) — общий термин для немотивированной агрессии в игре. Любое силовое РП должно иметь предысторию и повод.',
      },
      {
        q: 'Что такое Fail RP?',
        a: 'Fail RP — некачественный, нелогичный отыгрыш: игнорирование ранений, беготня со связанными руками, споры о правилах прямо в РП-чате, нереалистичное поведение персонажа в критической ситуации.',
      },
      {
        q: 'Что такое Fear RP?',
        a: 'Fear RP — обязанность отыгрывать инстинкт самосохранения. Если персонажу угрожают оружием с близкого расстояния, он должен вести себя так, будто реально боится за жизнь, а не игнорировать угрозу.',
      },
      {
        q: 'Что такое New Life Rule (NLR)?',
        a: 'После смерти персонаж считается потерявшим воспоминания о событиях, приведших к смерти, и не может мстить или возвращаться на место инцидента в течение установленного времени. Это правило защищает от бесконечных циклов мести.',
      },
      {
        q: 'Можно ли выходить из игры во время конфликта (Combat Log)?',
        a: 'Нет. Выход из игры или отключение во время силового РП, погони или задержания расценивается как Combat Log и наказывается — вне зависимости от причины (кроме реального обрыва связи, что проверяется отдельно).',
      },
      {
        q: 'Что за «зелёные зоны» и можно ли там устраивать РП со стрельбой?',
        a: 'Безопасные зоны (обычно возле точек старта, госучреждений и т.п.) исключают силовое РП. Там разрешён только мирный отыгрыш — переговоры, торговля, разговоры персонажей.',
      },
    ],
  },
  {
    id: 'examples',
    label: 'Примеры РП',
    icon: <IconMask />,
    color: '#8b5cf6',
    items: [
      {
        q: 'Как выглядит хороший пример отыгрыша при ограблении?',
        a: '«/me медленно достаёт из-за пояса пистолет, направляя его в пол» → «Так, без резких движений, это ограбление, мне нужны деньги из кассы» → «/do если жертва подчиняется, отдаёт содержимое кассы». Обе стороны используют /me и /do, дают друг другу пространство для реакции, никто не решает исход за оппонента.',
      },
      {
        q: 'А как выглядит тот же пример, но с нарушениями?',
        a: 'Игрок молча стреляет без единой реплики и предупреждения (нарушение Fear RP и логики), либо пишет «/me одним выстрелом убивает тебя наповал» (PowerGaming — результат навязан без шанса на реакцию), либо после смерти сразу возвращается мстить (нарушение NLR).',
      },
      {
        q: 'Пример правильного использования /me и /do',
        a: '/me описывает действие своего персонажа от третьего лица: «/me закуривает сигарету, облокотившись на капот». /do описывает объективный факт или уточнение, которое не зависит от намерения: «/do на капоте видны свежие царапины». Не стоит смешивать эмоции и факты — для эмоций есть /me, для механики — /do.',
      },
      {
        q: 'Как разрешать спор между игроками, если что-то пошло не по РП?',
        a: 'Правильный путь — использовать OOC-чат (обычно /b или скобки (( )) ) кратко, без выхода из образа, либо сразу вызвать администратора через игровую команду жалобы. Не стоит останавливать сцену и спорить в общем чате — это тоже NonRP.',
      },
      {
        q: 'Пример нормального бытового РП вне конфликтов',
        a: 'Два персонажа встречаются в кафе: «/me присаживается за столик, кладёт на него папку с документами» → «Слушай, по поводу вчерашнего разговора...» — обычный диалог в характере персонажа, без спешки и мета-информации, отлично подходит новичкам чтобы освоиться перед более серьёзными сценами.',
      },
    ],
  },
  {
    id: 'tips',
    label: 'Полезные советы',
    icon: <IconLifebuoy />,
    color: '#3fb787',
    items: [
      {
        q: 'Я только пришёл на сервер — с чего начать?',
        a: 'Сначала прочитай правила выше и загляни в Discord сервера — там обычно есть закреплённые гайды и объявления. Первую неделю лучше провести в спокойном бытовом РП, чтобы освоить команды /me и /do, прежде чем лезть в силовые сюжеты.',
      },
      {
        q: 'Меня забанили/выдали выговор незаслуженно — что делать?',
        a: 'Не стоит спорить с модератором в игровом чате. Подай апелляцию через раздел «Пользователи» → карточка профиля, либо обратись в соответствующий канал Discord с описанием ситуации и, по возможности, записью произошедшего.',
      },
      {
        q: 'Как получить роль в администрации или разработке?',
        a: 'Обычно наборы объявляются в Discord-сервере. Требования разнятся, но почти всегда важны: чистая история без банов и выговоров, активность и адекватное поведение в РП.',
      },
      {
        q: 'Куда жаловаться на другого игрока?',
        a: 'Через внутриигровую команду репорта во время инцидента (это фиксирует момент нарушения) или в раздел жалоб на Discord-сервере — приложи по возможности скриншот/запись, это сильно ускоряет рассмотрение.',
      },
      {
        q: 'Не нашёл ответ на свой вопрос — куда обратиться?',
        a: 'Задай вопрос в соответствующем канале Discord-сервера — там на связи модераторы и опытные игроки, которые помогут разобраться.',
      },
    ],
  },
]

export default function FAQ() {
  const [activeCat, setActiveCat] = useState('rules')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return CATEGORIES
    return CATEGORIES
      .map(cat => ({
        ...cat,
        items: cat.items.filter(it => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)),
      }))
      .filter(cat => cat.items.length > 0)
  }, [search])

  const isSearching = search.trim().length > 0
  const visibleCats = isSearching ? filtered : CATEGORIES.filter(c => c.id === activeCat)

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <div className="text-[11px] text-orange-400 tracking-[2.5px] uppercase font-bold mb-1.5">Помощь игрокам</div>
        <h1 className="text-2xl font-black tracking-tight m-0">FAQ и правила РП</h1>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          Здесь собраны правила отыгрыша, примеры того, как это выглядит на практике, и общие советы для новичков.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
          <IconSearch />
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по вопросам, например «метагейминг»…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10 transition-colors"
        />
      </div>

      {/* Category tabs (hidden while searching) */}
      {!isSearching && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {CATEGORIES.map(cat => {
            const active = activeCat === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCat(cat.id); setOpenId(null) }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  active ? 'text-white border-transparent' : 'text-slate-400 border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:text-white'
                }`}
                style={active ? { background: `${cat.color}22`, borderColor: `${cat.color}55`, color: cat.color } : undefined}
              >
                {cat.icon}
                {cat.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Accordion list */}
      <div className="space-y-6">
        {visibleCats.length === 0 && (
          <div className="text-center py-16 text-slate-500 text-sm">
            Ничего не найдено по запросу «{search}»
          </div>
        )}

        {visibleCats.map(cat => (
          <div key={cat.id}>
            {isSearching && (
              <div className="flex items-center gap-2 mb-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: cat.color }}>
                {cat.icon} {cat.label}
              </div>
            )}
            <div className="space-y-2">
              {cat.items.map((item, i) => {
                const id = `${cat.id}-${i}`
                const open = openId === id
                return (
                  <div
                    key={id}
                    className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden transition-colors hover:border-white/10"
                  >
                    <button
                      onClick={() => setOpenId(open ? null : id)}
                      className="w-full flex items-center justify-between gap-3 text-left px-4 py-3.5"
                    >
                      <span className="text-[13.5px] font-semibold text-slate-100">{item.q}</span>
                      <span style={{ color: cat.color }}><IconChevron open={open} /></span>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 text-[13px] leading-relaxed text-slate-400 border-t border-white/5 pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer callout */}
      <div className="mt-8 flex items-center gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/5 px-5 py-4">
        <div className="text-orange-400 flex-shrink-0"><IconLifebuoy /></div>
        <div className="text-[13px] text-slate-300">
          Не нашли ответ на свой вопрос? Загляните в Discord сервера — там всегда можно спросить у модераторов напрямую.
        </div>
      </div>
    </div>
  )
}