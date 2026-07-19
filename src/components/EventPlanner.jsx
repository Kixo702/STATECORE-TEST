import { useState, useMemo, useEffect } from 'react'
import { notifyFactionInvite } from '../lib/notifications'
import { getEvents, subscribeEvents, addEvent, updateEvent } from '../lib/Eventstore'

// ---------------------------------------------------------------------------
// Справочники
// ---------------------------------------------------------------------------

const EVENT_TYPES = [
  { id: 'grp', label: 'ГРП', color: 'orange' },
  { id: 'training', label: 'Совместная тренировка', color: 'sky' },
  { id: 'checkpoint', label: 'Блок-пост', color: 'red' },
  { id: 'inspection', label: 'Проверка', color: 'violet' },
]

const TYPE_STYLES = {
  orange: {
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    dot: 'bg-orange-500',
    solid: 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/20',
  },
  sky: {
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    dot: 'bg-sky-500',
    solid: 'bg-gradient-to-r from-sky-500 to-sky-600 shadow-sky-500/20',
  },
  red: {
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
    dot: 'bg-red-500',
    solid: 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/20',
  },
  violet: {
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    dot: 'bg-violet-500',
    solid: 'bg-gradient-to-r from-violet-500 to-violet-600 shadow-violet-500/20',
  },
}

const typeMeta = (id) => EVENT_TYPES.find((t) => t.id === id) || EVENT_TYPES[0]

// Категории фракций проекта
const FACTIONS = [
  { id: 'gov', label: 'Гос. структуры', accent: '56,189,248' },
  { id: 'mafia', label: 'Мафии', accent: '239,68,68' },
  { id: 'ghetto', label: 'Гетто', accent: '168,85,247' },
  { id: 'bikers', label: 'Байкеры', accent: '251,146,60' },
]

// Организации внутри каждой категории (то, что реально выбирается в форме)
const ORGANIZATIONS = {
  gov: [
    { id: 'gov', label: 'GOV', group: 'Правительство' },
    { id: 'lspd', label: 'LSPD', group: 'Полицейские департаменты' },
    { id: 'sfpd', label: 'SFPD', group: 'Полицейские департаменты' },
    { id: 'lvmpd', label: 'LVMPD', group: 'Полицейские департаменты' },
    { id: 'fbi', label: 'FBI', group: 'Полицейские департаменты' },
    { id: 'mcls', label: 'MCLS', group: 'Медицинские центры' },
    { id: 'mcsf', label: 'MCSF', group: 'Медицинские центры' },
    { id: 'mclv', label: 'MCLV', group: 'Медицинские центры' },
    { id: 'usmc', label: 'USMC', group: 'Армия' },
  ],
  mafia: [
    { id: 'russian', label: 'Russian Mafia' },
    { id: 'lcn', label: 'La Cosa Nostra (LCN)' },
    { id: 'yakuza', label: 'Yakuza' },
  ],
  ghetto: [
    { id: 'grove', label: 'Grove Street' },
    { id: 'rifa', label: 'Rifa' },
    { id: 'ballas', label: 'Ballas' },
    { id: 'vagos', label: 'Vagos' },
    { id: 'aztec', label: 'Aztecas' },
  ],
  bikers: [
    { id: 'bandidos', label: 'Bandidos MC' },
    { id: 'hells_angels', label: 'Hells Angels MC' },
    { id: 'warlocks', label: 'Warlocks MC' },
  ],
}

const ALL_ORGS = Object.entries(ORGANIZATIONS).flatMap(([factionId, orgs]) =>
  orgs.map((o) => ({ ...o, factionId }))
)

const findOrg = (id) => ALL_ORGS.find((o) => o.id === id)
const findFaction = (id) => FACTIONS.find((f) => f.id === id)

const SCENARIO_BANK = {
  grp: [
    'На окраине города зафиксирована утечка неизвестного вещества — требуется оцепление района, эвакуация мирных жителей и работа профильных служб на месте.',
    'Группа неизвестных лиц заблокировала центральную площадь и выдвигает требования — необходимы переговорщики и силовой резерв на случай обострения.',
    'В здании администрации сработала сигнализация: есть подозрение на проникновение. Нужна слаженная зачистка этажей и охрана периметра.',
  ],
  training: [
    'Совместные учения по отработке штурма здания малой этажности с последующим разбором ошибок и выдачей рекомендаций.',
    'Полигонные стрельбы и физическая подготовка — акцент на слаженность действий в составе группы.',
    'Отработка тактической медицины: эвакуация условно раненого под прикрытием, наложение жгутов, транспортировка.',
  ],
  checkpoint: [
    'Плановый блок-пост на въезде в город: проверка документов, досмотр транспорта, контроль запрещённых предметов.',
    'Усиленный блок-пост в связи с ростом числа нарушений на трассе — совместно с патрульной службой.',
    'Ночной блок-пост на границе района для контроля за перемещением после комендантского часа.',
  ],
  inspection: [
    'Плановая проверка соблюдения санитарных норм в заведениях общественного питания района.',
    'Внеплановая проверка охраняемого объекта на предмет соблюдения пропускного режима.',
    'Совместная ревизия документации и оснащения профильного ведомства.',
  ],
}

const genId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const formatDateTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ---------------------------------------------------------------------------
// Мелкие UI-компоненты
// ---------------------------------------------------------------------------

function TypeBadge({ typeId }) {
  const meta = typeMeta(typeId)
  const styles = TYPE_STYLES[meta.color]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-extrabold uppercase tracking-wide ${styles.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      {meta.label}
    </span>
  )
}

function OrgChip({ orgId, status, canAct, onAccept }) {
  const org = findOrg(orgId)
  const faction = org ? findFaction(org.factionId) : null
  const accent = faction?.accent || '148,163,184'
  const label = org?.label || orgId

  if (status === 'confirmed') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] font-bold">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {label} · Участник (Лидер подтвердил)
      </div>
    )
  }

  if (canAct) {
    return (
      <button
        onClick={onAccept}
        style={{ borderColor: `rgba(${accent},0.45)`, color: `rgb(${accent})` }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border text-[11px] font-bold hover:text-white transition-all duration-150"
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `rgb(${accent})`; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = `rgb(${accent})` }}
      >
        {label} · Принять участие
      </button>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-slate-500 text-[11px] font-bold">
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `rgb(${accent})`, opacity: 0.5 }} />
      {label} · Ожидает подтверждения
    </div>
  )
}

// ---------------------------------------------------------------------------
// Основной компонент
// ---------------------------------------------------------------------------

export default function EventPlanner({ user }) {
  const [events, setEvents] = useState(() => getEvents())
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState('all')

  const [form, setForm] = useState({
    title: '',
    type: 'grp',
    dateTime: '',
    scenario: '',
    requiredOrgs: [],
  })

  useEffect(() => {
    const unsubscribe = subscribeEvents(setEvents)
    return unsubscribe
  }, [])

  // Организация текущего пользователя — подстройте под реальную модель user,
  // если поле называется иначе (user.organization / user.org / user.faction)
  const myOrgId = user?.organization || user?.org || user?.faction || null

  const visibleEvents = useMemo(() => {
    if (filterType === 'all') return events
    return events.filter((e) => e.type === filterType)
  }, [events, filterType])

  const resetForm = () => setForm({ title: '', type: 'grp', dateTime: '', scenario: '', requiredOrgs: [] })

  const toggleOrg = (orgId) => {
    setForm((prev) => ({
      ...prev,
      requiredOrgs: prev.requiredOrgs.includes(orgId)
        ? prev.requiredOrgs.filter((id) => id !== orgId)
        : [...prev.requiredOrgs, orgId],
    }))
  }

  const handleGenerateScenario = () => {
    const bank = SCENARIO_BANK[form.type] || []
    if (bank.length === 0) return
    const scenario = bank[Math.floor(Math.random() * bank.length)]
    setForm((prev) => ({ ...prev, scenario }))
  }

  const handleCreate = (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.dateTime || form.requiredOrgs.length === 0) return

    const organizerOrgId = myOrgId || 'gov'
    const organizerLabel = findOrg(organizerOrgId)?.label || organizerOrgId

    const newEvent = {
      id: genId(),
      title: form.title.trim(),
      type: form.type,
      dateTime: new Date(form.dateTime).toISOString(),
      scenario: form.scenario.trim(),
      organizer: { nickname: user?.nickname || user?.name || user?.login || 'Лидер', organization: organizerOrgId },
      requiredOrgs: form.requiredOrgs.map((id) => ({ id, status: 'pending' })),
      createdAt: new Date().toISOString(),
    }

    addEvent(newEvent)

    // Рассылаем уведомления лидерам всех отмеченных организаций.
    // Колокольчик в Topbar должен подписаться на subscribeNotifications()
    // из lib/notifications.js, чтобы увидеть их в реальном времени.
    form.requiredOrgs.forEach((orgId) => {
      notifyFactionInvite({
        organizerNick: newEvent.organizer.nickname,
        organizerFaction: organizerLabel,
        eventTitle: newEvent.title,
        eventId: newEvent.id,
        targetFactionCode: orgId,
      })
    })

    resetForm()
    setShowForm(false)
  }

  const handleAccept = (eventId, orgId) => {
    updateEvent(eventId, (ev) => ({
      ...ev,
      requiredOrgs: ev.requiredOrgs.map((f) => (f.id === orgId ? { ...f, status: 'confirmed' } : f)),
    }))
  }

  return (
    <div className="px-4 md:px-8 py-6 space-y-6">
      {/* Заголовок и действия */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Планировщик совместных мероприятий</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Организуйте ГРП, тренировки, блок-посты и проверки совместно с другими фракциями
          </p>
        </div>

        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-extrabold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:brightness-110 transition-all duration-200"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          {showForm ? 'Отменить' : 'Создать мероприятие'}
        </button>
      </div>

      {/* Форма создания */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 md:p-6 space-y-5"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-white/40">Название</label>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Например: Утечка на промзоне"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e18] border border-white/[0.08] text-sm text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/50 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-white/40">Дата и время проведения</label>
              <input
                type="datetime-local"
                value={form.dateTime}
                onChange={(e) => setForm((p) => ({ ...p, dateTime: e.target.value }))}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e18] border border-white/[0.08] text-sm text-white outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/50 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-white/40">Тип мероприятия</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((t) => {
                const active = form.type === t.id
                const styles = TYPE_STYLES[t.color]
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setForm((p) => ({ ...p, type: t.id }))}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all duration-150 ${
                      active
                        ? `text-white ${styles.solid} bg-gradient-to-r border-transparent shadow-lg`
                        : 'text-slate-400 bg-white/[0.02] border-white/[0.06] hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-white/40">Сценарий</label>
              <button
                type="button"
                onClick={handleGenerateScenario}
                className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-orange-400 hover:text-orange-300 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
                  <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.95-6.95l-2.12 2.12M8.17 15.83l-2.12 2.12m0-13.6l2.12 2.12m9.66 9.66l-2.12-2.12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Сгенерировать случайный РП-сценарий
              </button>
            </div>
            <textarea
              value={form.scenario}
              onChange={(e) => setForm((p) => ({ ...p, scenario: e.target.value }))}
              placeholder="Опишите вводную для участников..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e18] border border-white/[0.08] text-sm text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/50 transition-all resize-none"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-white/40">
              Требуемые фракции / организации
            </label>

            {FACTIONS.map((faction) => {
              const orgs = ORGANIZATIONS[faction.id] || []
              const groups = orgs.reduce((acc, o) => {
                const key = o.group || null
                if (!acc[key]) acc[key] = []
                acc[key].push(o)
                return acc
              }, {})

              return (
                <div
                  key={faction.id}
                  className="rounded-xl border bg-white/[0.015] p-3.5 space-y-2.5"
                  style={{ borderColor: `rgba(${faction.accent},0.18)` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `rgb(${faction.accent})` }} />
                    <span className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: `rgb(${faction.accent})` }}>
                      {faction.label}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(groups).map(([groupName, groupOrgs]) => (
                      <div key={groupName || 'ungrouped'} className="space-y-1.5">
                        {groupName !== 'null' && groupName && (
                          <div className="text-[9px] font-bold uppercase tracking-wide text-white/25">{groupName}</div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {groupOrgs.map((org) => {
                            const checked = form.requiredOrgs.includes(org.id)
                            return (
                              <label
                                key={org.id}
                                className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-150"
                                style={
                                  checked
                                    ? { backgroundColor: `rgba(${faction.accent},0.12)`, borderColor: `rgba(${faction.accent},0.4)`, color: `rgb(${faction.accent})` }
                                    : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', color: '#94a3b8' }
                                }
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleOrg(org.id)}
                                  className="sr-only"
                                />
                                <span
                                  className="w-3.5 h-3.5 rounded-md border flex items-center justify-center flex-shrink-0"
                                  style={checked ? { backgroundColor: `rgb(${faction.accent})`, borderColor: `rgb(${faction.accent})` } : { borderColor: 'rgba(255,255,255,0.2)' }}
                                >
                                  {checked && (
                                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none">
                                      <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </span>
                                {org.label}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {form.requiredOrgs.length === 0 && (
              <p className="text-[11px] text-slate-500">Отметьте хотя бы одну организацию — им придёт уведомление.</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm() }}
              className="px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-slate-400 text-xs font-bold hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-extrabold shadow-lg shadow-orange-500/20 hover:brightness-110 transition-all"
            >
              Опубликовать мероприятие
            </button>
          </div>
        </form>
      )}

      {/* Фильтр по типу */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
            filterType === 'all'
              ? 'bg-white/[0.08] border-white/[0.15] text-white'
              : 'bg-white/[0.02] border-white/[0.06] text-slate-500 hover:text-white'
          }`}
        >
          Все
        </button>
        {EVENT_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilterType(t.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
              filterType === t.id
                ? 'bg-white/[0.08] border-white/[0.15] text-white'
                : 'bg-white/[0.02] border-white/[0.06] text-slate-500 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Лента мероприятий */}
      <div className="grid md:grid-cols-2 gap-4">
        {visibleEvents.length === 0 && (
          <div className="md:col-span-2 rounded-2xl border border-dashed border-white/[0.08] p-10 text-center text-slate-500 text-sm">
            Мероприятий пока нет. Создайте первое, чтобы пригласить другие фракции.
          </div>
        )}

        {visibleEvents.map((ev) => {
          const confirmedCount = ev.requiredOrgs.filter((f) => f.status === 'confirmed').length
          const organizerOrg = findOrg(ev.organizer.organization)
          return (
            <div
              key={ev.id}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all duration-200 p-5 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <TypeBadge typeId={ev.type} />
                  <h3 className="text-sm font-extrabold text-white leading-snug">{ev.title}</h3>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-wide text-white/30">Начало</div>
                  <div className="text-xs font-bold text-slate-300 tabular-nums">{formatDateTime(ev.dateTime)}</div>
                </div>
              </div>

              {ev.scenario && (
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{ev.scenario}</p>
              )}

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none">
                  <path d="M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM8 11c1.657 0 3-1.343 3-3S9.657 5 8 5 5 6.343 5 8s1.343 3 3 3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 20c0-3.314 2.686-6 6-6h8c3.314 0 6 2.686 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Организатор: <span className="font-bold text-slate-300">{ev.organizer.nickname}</span>
                <span className="text-white/20">·</span>
                <span className="font-bold text-slate-300">{organizerOrg?.label || ev.organizer.organization}</span>
              </div>

              <div className="h-px bg-white/[0.06]" />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-white/30">Требуемые фракции</div>
                  <div className="text-[10px] font-bold text-slate-500">
                    {confirmedCount}/{ev.requiredOrgs.length} подтвердили
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ev.requiredOrgs.map((f) => {
                    const canAct = f.status === 'pending' && myOrgId && myOrgId === f.id
                    return (
                      <OrgChip
                        key={f.id}
                        orgId={f.id}
                        status={f.status}
                        canAct={canAct}
                        onAccept={() => handleAccept(ev.id, f.id)}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}