import { useState, useEffect } from 'react'

// ── Constants ────────────────────────────────────────────────
const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1pYaxNrSm37hydzEyLNuQsYOHF4jTfClDoJbqbSCkk2M/export?format=csv'
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwKkpW841ffumVxopzGxtECxH9-4yp-mbQa_8L4_uMrAKVsl3-yrso54sjYQrbo2Ym1/exec'

// Ссылки на таблицы остальных сфер (Texas) — те же источники, что в Organizations.jsx,
// нужны здесь только для чтения (подсчёт статистики/лидеров), без записи.
const BO_SHEETS_URL     = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRE89xZb9RxVOSfXbtQ4-fyu-FH9r-5ntI4AdPI6xPqmzRh0jVYd9qITXDCpWCEC0RFptElukEjhvD5/pub?gid=0&single=true&output=csv'
const MAFIA_SHEETS_URL  = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRhlLfLsJs2k5DwBm3Lu7B4EuH3b-5kZNNHMGZHhyfpb00XyuPcOIppSFuAGRQXzNR7fFYsPbM6CPuy/pub?gid=0&single=true&output=csv'
const BIKERS_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHseJAxV3J2Pyc5-2uvKT97k6Gmf01Oc5uddvZFXlP7FxdbSom1lNMWLsDar0SF66gT5ObWlIzQbaN/pub?gid=0&single=true&output=csv'
const GHETTO_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlRt1hpLQy_7Z7G1PxISAmhgHcc9qS1QX4od1kG4BpM9x1QzPBffKNsA1J3FJwFoXo1rhxyJsGpIHF/pub?gid=0&single=true&output=csv'

const MAFIA_LEADER_ROWS  = [14, 16, 18]
const BIKERS_LEADER_ROWS = [14, 16, 18]
const GHETTO_LEADER_ROWS = [13, 15, 17, 19, 21]

// Разбирает CSV-строку в массив строк-массивов ячеек (учитывает запятые внутри кавычек)
const parseCsv = csv => csv.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/))
const cellClean = s => s?.replace(/"/g, '').trim() || ''

// Загрузка организаций по сферам (только на чтение) — используется для статистики
// на дешборде. Логика парсинга продублирована из Organizations.jsx: там она
// работает с записью, здесь достаточно узнать только leader/vacancy по каждой строке.
const loadOrgsBySphere = {
  gov: async () => {
    const res = await fetch(`${SHEETS_URL}&cacheBust=${Date.now()}`)
    const rows = parseCsv(await res.text())
    return rows.slice(5, 14).map((row, i) => ({
      id: i + 6,
      leader: cellClean(row[2]) || 'Вакантно',
    }))
  },
  business: async () => {
    const res = await fetch(`${BO_SHEETS_URL}&cacheBust=${Date.now()}`)
    const rows = parseCsv(await res.text())
    const parsed = []
    rows.forEach((row, i) => {
      if (cellClean(row[2]) !== 'Директор') return
      parsed.push({ id: i + 1, leader: cellClean(row[4]) || 'Вакантно' })
    })
    return parsed
  },
  syndicate: async () => {
    const res = await fetch(`${MAFIA_SHEETS_URL}&cacheBust=${Date.now()}`)
    const rows = parseCsv(await res.text())
    return MAFIA_LEADER_ROWS.map(rowNum => {
      const row = rows[rowNum - 1] || []
      return { id: rowNum, leader: cellClean(row[3]) || 'Вакантно' }
    })
  },
  bikers: async () => {
    const res = await fetch(`${BIKERS_SHEETS_URL}&cacheBust=${Date.now()}`)
    const rows = parseCsv(await res.text())
    const pair = (row, i1, i2) => cellClean(row[i1]) || cellClean(row[i2])
    return BIKERS_LEADER_ROWS.map(rowNum => {
      const row = rows[rowNum - 1] || []
      return { id: rowNum, leader: pair(row, 3, 4) || 'Вакантно' }
    })
  },
  street: async () => {
    const res = await fetch(`${GHETTO_SHEETS_URL}&cacheBust=${Date.now()}`)
    const rows = parseCsv(await res.text())
    return GHETTO_LEADER_ROWS.map(rowNum => {
      const row = rows[rowNum - 1] || []
      return { id: rowNum, leader: cellClean(row[3]) || 'Вакантно' }
    })
  },
}

// Сферы, для которых уже подключены реальные таблицы (см. Organizations.jsx).
// Остальные (пока нет в READY-списке) продолжают показывать заглушку "в разработке".
const READY_STAT_SPHERES = ['gov', 'business', 'syndicate', 'bikers', 'street']

// Список доступных серверов
const SERVERS = ['Texas', 'Florida', 'Nevada', 'Hawaii', 'Indiana']

// Узлы фракций для фильтра статистики над дешбордом
const FRACTION_NODES = [
  { id: 'gov',      label: 'Государственные организации' },
  { id: 'business', label: 'Бизнес организации' },
  { id: 'syndicate', label: 'Преступные синдикаты' },
  { id: 'bikers',   label: 'Байкерские клубы' },
  { id: 'street',   label: 'Уличные группировки' },
]

// Словарь для правильного склонения ГС и ЗГС в родительном падеже
const LEADERSHIP_NAMES = {
  gov: { gs: 'Главный Следящий гос', zgs: 'Зам. Главного следящего гос' },
  business: { gs: 'Главный Следящий радио', zgs: 'Зам. Главного следящего радио' },
  syndicate: { gs: 'Главный Следящий мафий', zgs: 'Зам. Главного следящего мафий' },
  bikers: { gs: 'Главный Следящий байкеров', zgs: 'Зам. Главного следящего байкеров' },
  street: { gs: 'Главный Следящий гетто', zgs: 'Зам. Главного следящего гетто' },
}

// Статус для узлов, где статистика ещё не подключена.
const FRACTION_STATUS = 'development' // 'development' | 'negotiation'

const FRACTION_STATUS_TEXT = {
  development: 'Сфера фракций находится в разработке',
  negotiation: 'В данный момент идут переговоры с Главной следящей администрацией за сферой',
}

// Руководство (ГС/ЗГС) по серверам И сферам — заполняется вручную.
// Если ГС или ЗГС отсутствует — ставим null, и в карточке покажется «Отсутствует».
// Раньше здесь были данные только для гос.структур (без разбивки по сферам);
// теперь ключ верхнего уровня — сервер, второго уровня — id сферы (см. FRACTION_NODES).
const LEADERSHIP_BY_SERVER_AND_SPHERE = {
  Texas: {
    gov: {
      gs:  { nickname: 'Robert_Kamiya',  vk: 'vk.com/robertkamiya', forum: 'forum.gta-mobile.ru/members/171464/' },
      zgs: { nickname: 'Minato_Ramirez', vk: 'vk.com/minatoramirez', forum: 'forum.gta-mobile.ru/vaxi/' },
    },
    // Руководство ещё не назначено — заполнить ники/вк/форум, когда появятся.
    business:  { gs: null, zgs: null },
    syndicate: { gs: null, zgs: null },
    bikers:    { gs: null, zgs: null },
    street:    { gs: null, zgs: null },
  },
  Florida: {
    gov: {
      gs:  { nickname: 'Kimberly Qwenty', vk: 'https://vk.ru/ygol_antihype', forum: 'https://forum.gta-mobile.ru/v_moey_krovi_ledokain/' },
      zgs: null,
    },
  },
  Nevada: {
    gov: {
      gs:  { nickname: 'Lamberti_Quinn', vk: 'https://vk.com/hardnes_s', forum: 'https://forum.gta-mobile.ru/hardness/#about' },
      zgs: { nickname: 'Marcus_Martinez', vk: 'https://vk.com/norm_chei', forum: 'https://forum.gta-mobile.ru/members/84216/#about' },
    },
  },
  Hawaii: {
    gov: {
      gs:  null,
      zgs: null,
      // Врио ГС — временно исполняет обязанности, показывается отдельной карточкой со статусом «ВРИО»
      actingGs: { nickname: 'Austin Collins', vk: 'https://vk.com/id852509629', forum: 'https://forum.gta-mobile.ru/legendary134/' },
    },
  },
  Indiana: {
    gov: {
      gs:  { nickname: 'Samuel_Vinogradov', vk: 'https://vk.ru/id388929639', forum: 'https://forum.gta-mobile.ru/members/24462/' },
      zgs: null,
    },
  },
}

// Открывает внешнюю ссылку только после подтверждения пользователем
const normalizeExternalUrl = (value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`)

const confirmAndOpenExternal = (value) => {
  const url = normalizeExternalUrl(value)
  const ok = window.confirm(`Вы уверены, что хотите покинуть сайт и перейти на страницу «${url}»?`)
  if (ok) window.open(url, '_blank', 'noopener,noreferrer')
}

// Кликабельная ссылка (вк/форум) с иконкой и подтверждением перехода; если данных нет — плейсхолдер
function LeaderContactLink({ icon, value }) {
  if (!value) {
    return (
      <span className="flex items-center gap-1.5 opacity-50">
        <span className="w-3.5 h-3.5">{icon}</span>нет данных
      </span>
    )
  }
  const url = normalizeExternalUrl(value)
  return (
    <a
      href={url}
      onClick={(e) => { e.preventDefault(); confirmAndOpenExternal(value) }}
      className="flex items-center gap-1.5 hover:text-orange-400 transition-colors cursor-pointer underline decoration-dotted underline-offset-2"
    >
      <span className="w-3.5 h-3.5">{icon}</span>{value}
    </a>
  )
}

const todayISO = () => new Date().toISOString().split('T')[0]
const addDays  = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0] }
const fmtDate  = iso => { if (!iso) return ''; const [y,m,day] = iso.split('-'); return `${day}.${m}.${y}` }

// ── Icons ─────────────────────────────────────────────────────
const IC = {
  org:     <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none"><path d="M4 21V7l8-4 8 4v14" stroke="currentColor" strokeWidth="1.6"/><path d="M9 21v-8h6v8" stroke="currentColor" strokeWidth="1.6"/></svg>,
  crown:   <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none"><path d="M3 7l4 5 5-6 5 6 4-5v10H3V7z" stroke="currentColor" strokeWidth="1.6"/></svg>,
  cross:   <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6"/></svg>,
  warning: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none"><path d="M12 3l9 18H3l9-18z" stroke="currentColor" strokeWidth="1.6"/></svg>,
  bell:    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  x:       <svg viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
  user:    <svg viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/></svg>,
  link:    <svg viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  cal:     <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.8"/></svg>,
  check:   <svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  shield:  <svg viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  spin:    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="56" strokeDashoffset="14" strokeLinecap="round"/></svg>,
}

// ── Assign Leader Modal ───────────────────────────────────────
function AssignLeaderModal({ onClose }) {
  const [orgs, setOrgs]         = useState([])
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [selOrg, setSelOrg]     = useState(null)

  const [fNick, setFNick]       = useState('')
  const [fVK, setFVK]           = useState('')
  const [fForum, setFForum]     = useState('')
  const [fAppoint, setFAppoint] = useState(todayISO())
  const [fExpiry, setFExpiry]   = useState(addDays(todayISO(), 28))

  const [busy, setBusy]         = useState(false)
  const [done, setDone]         = useState(false)
  const [visible, setVisible]   = useState(false)

  // animate in
  useEffect(() => { setTimeout(() => setVisible(true), 10) }, [])

  // load vacant orgs
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${SHEETS_URL}&cacheBust=${Date.now()}`)
        const csv = await res.text()
        const rows = csv.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/))
        const parsed = rows.slice(5, 14).map((row, i) => {
          const c = s => s?.replace(/"/g, '').trim() || ''
          return { id: i + 6, name: c(row[3]), leader: c(row[2]) || 'Вакантно' }
        }).filter(o => o.leader === 'Вакантно' && o.name)
        setOrgs(parsed)
      } catch (e) { console.error(e) }
      finally { setLoadingOrgs(false) }
    }
    load()
  }, [])

  // auto-update expiry when appoint or org changes
  useEffect(() => {
    setFExpiry(addDays(fAppoint, selOrg?.name === 'GOV' ? 30 : 28))
  }, [fAppoint, selOrg])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  const handleSubmit = async () => {
    if (!selOrg || !fNick.trim()) return
    setBusy(true)
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SET_LEADER',
          rowId: selOrg.id,
          name:  fNick,
          vk:    fVK,
          forum: fForum,
          appointDate: fmtDate(fAppoint),
          expiryDate:  fmtDate(fExpiry),
        }),
      })
      await new Promise(r => setTimeout(r, 1000))
      setDone(true)
      setTimeout(handleClose, 1600)
    } catch (e) { console.error(e) }
    finally { setBusy(false) }
  }

  const canSubmit = selOrg && fNick.trim()

  return (
    <div
      onClick={e => e.target === e.currentTarget && handleClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: visible ? 'rgba(0,0,0,.72)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(14px)' : 'blur(0px)',
        transition: 'all .28s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 520,
        background: 'linear-gradient(160deg, #141b2e 0%, #0d1120 100%)',
        border: '1px solid rgba(255,255,255,.09)',
        borderRadius: 28,
        boxShadow: '0 40px 100px rgba(0,0,0,.75), 0 0 0 1px rgba(255,140,0,.06), inset 0 1px 0 rgba(255,255,255,.06)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1) translateY(0)' : 'scale(.94) translateY(24px)',
        transition: 'all .28s cubic-bezier(.34,1.2,.64,1)',
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* top accent bar */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, #ff8c00, #ff5500, #ff8c00)',
          backgroundSize: '200% 100%',
          animation: 'db-shimmer 3s linear infinite',
        }}/>

        {/* glow orb */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 260, height: 260,
          background: 'radial-gradient(circle, rgba(255,140,0,.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}/>

        <div style={{ padding: '28px 32px 32px' }}>

          {/* header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                fontSize: 10, fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase',
                color: '#ff8c00', marginBottom: 10, opacity: .85,
              }}>
                <span style={{ width: 16, height: 16, display: 'flex' }}>{IC.shield}</span>
                Назначение лидера
              </div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#f0f4fc', letterSpacing: '-0.4px' }}>
                Выберите организацию
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,.38)', lineHeight: 1.5 }}>
                Заполните данные нового лидера для вакантной должности
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{
                flexShrink: 0, width: 34, height: 34,
                background: 'rgba(255,255,255,.06)',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,.4)',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.12)'; e.currentTarget.style.color='#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.06)'; e.currentTarget.style.color='rgba(255,255,255,.4)' }}
            >
              <span style={{ width: 16, height: 16, display: 'flex' }}>{IC.x}</span>
            </button>
          </div>

          {done ? (
            /* ── SUCCESS ── */
            <div style={{ textAlign: 'center', padding: '24px 0 8px', animation: 'db-fadeUp .3s ease both' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 18px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(34,197,94,.4)',
                animation: 'db-success .5s cubic-bezier(.34,1.56,.64,1) both',
              }}>
                <span style={{ color: '#fff', width: 22, height: 22, display: 'flex' }}>{IC.check}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#f0f4fc', marginBottom: 6 }}>Лидер назначен!</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>Данные сохранены в таблице</div>
            </div>
          ) : (
            <>
              {/* ── ORG SELECTOR ── */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: 10 }}>
                  Организация
                </div>
                {loadingOrgs ? (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.25)', padding: '12px 0', animation: 'db-pulse 1.4s ease infinite' }}>
                    Загрузка…
                  </div>
                ) : orgs.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', padding: '12px 16px', background: 'rgba(255,255,255,.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,.07)' }}>
                    Нет вакантных организаций
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {orgs.map(org => {
                      const active = selOrg?.id === org.id
                      return (
                        <button
                          key={org.id}
                          onClick={() => setSelOrg(org)}
                          style={{
                            padding: '8px 18px',
                            borderRadius: 12,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all .18s cubic-bezier(.34,1.4,.64,1)',
                            background: active
                              ? 'linear-gradient(135deg, #ff8c00, #e06000)'
                              : 'rgba(255,255,255,.05)',
                            border: `1px solid ${active ? 'rgba(255,140,0,.5)' : 'rgba(255,255,255,.1)'}`,
                            color: active ? '#fff' : 'rgba(255,255,255,.6)',
                            boxShadow: active ? '0 4px 18px rgba(255,140,0,.3)' : 'none',
                            transform: active ? 'scale(1.04)' : 'scale(1)',
                          }}
                          onMouseEnter={e => { if (!active) { e.currentTarget.style.background='rgba(255,255,255,.09)'; e.currentTarget.style.color='#fff' } }}
                          onMouseLeave={e => { if (!active) { e.currentTarget.style.background='rgba(255,255,255,.05)'; e.currentTarget.style.color='rgba(255,255,255,.6)' } }}
                        >
                          {org.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── DIVIDER ── */}
              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent)', margin: '4px 0 22px' }}/>

              {/* ── FORM FIELDS ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>

                {/* text inputs */}
                {[
                  { val: fNick,  set: setFNick,  ph: 'Ник лидера',        icon: IC.user, req: true  },
                  { val: fVK,    set: setFVK,    ph: 'VK (ссылка/ник)',   icon: IC.link, req: false },
                  { val: fForum, set: setFForum, ph: 'Форумный аккаунт',  icon: IC.link, req: false },
                ].map(f => (
                  <div key={f.ph} style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                      color: 'rgba(255,255,255,.28)', pointerEvents: 'none',
                      width: 15, height: 15, display: 'flex',
                    }}>{f.icon}</span>
                    <input
                      type="text"
                      placeholder={f.ph + (f.req ? ' *' : '')}
                      value={f.val}
                      onChange={e => f.set(e.target.value)}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,.05)',
                        border: '1px solid rgba(255,255,255,.1)',
                        borderRadius: 13, padding: '12px 14px 12px 40px',
                        fontSize: 14, color: '#eef2f8', fontFamily: 'inherit',
                        outline: 'none', transition: 'border-color .15s, box-shadow .15s, background .15s',
                      }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,140,0,.55)'
                        e.currentTarget.style.boxShadow  = '0 0 0 3px rgba(255,140,0,.12)'
                        e.currentTarget.style.background = 'rgba(255,255,255,.07)'
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'
                        e.currentTarget.style.boxShadow  = 'none'
                        e.currentTarget.style.background = 'rgba(255,255,255,.05)'
                      }}
                    />
                  </div>
                ))}

                {/* date inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Дата назначения', val: fAppoint, set: setFAppoint },
                    { label: `Снятие (+${selOrg?.name === 'GOV' ? 30 : 28}д)`, val: fExpiry, set: setFExpiry },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginBottom: 6, paddingLeft: 2 }}>
                        {f.label}
                      </div>
                      <div style={{ position: 'relative' }}>
                        <span style={{
                          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                          color: 'rgba(255,255,255,.28)', pointerEvents: 'none',
                          width: 14, height: 14, display: 'flex',
                        }}>{IC.cal}</span>
                        <input
                          type="date"
                          value={f.val}
                          onChange={e => f.set(e.target.value)}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            background: 'rgba(255,255,255,.05)',
                            border: '1px solid rgba(255,255,255,.1)',
                            borderRadius: 12, padding: '11px 12px 11px 36px',
                            fontSize: 13, color: '#eef2f8', fontFamily: 'inherit',
                            outline: 'none', colorScheme: 'dark',
                            transition: 'border-color .15s, box-shadow .15s',
                          }}
                          onFocus={e => {
                            e.currentTarget.style.borderColor = 'rgba(255,140,0,.55)'
                            e.currentTarget.style.boxShadow  = '0 0 0 3px rgba(255,140,0,.12)'
                          }}
                          onBlur={e => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'
                            e.currentTarget.style.boxShadow  = 'none'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── SUBMIT ── */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || busy}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifycontent: 'center', gap: 10,
                  padding: '14px 20px', borderRadius: 14, border: 'none',
                  background: canSubmit && !busy
                    ? 'linear-gradient(135deg, #ff8c00 0%, #e05a00 100%)'
                    : 'rgba(255,255,255,.07)',
                  color: canSubmit && !busy ? '#fff' : 'rgba(255,255,255,.3)',
                  fontSize: 14, fontWeight: 800, letterSpacing: '0.3px',
                  cursor: canSubmit && !busy ? 'pointer' : 'default',
                  boxShadow: canSubmit && !busy ? '0 6px 24px rgba(255,140,0,.3)' : 'none',
                  transition: 'all .2s ease',
                }}
                onMouseEnter={e => { if (canSubmit && !busy) e.currentTarget.style.filter='brightness(1.1)' }}
                onMouseLeave={e => { e.currentTarget.style.filter='brightness(1)' }}
              >
                {busy ? (
                  <>
                    <span style={{ animation: 'db-spin .7s linear infinite', width: 17, height: 17, display: 'flex' }}>{IC.spin}</span>
                    Сохранение…
                  </>
                ) : (
                  <>
                    <span style={{ width: 17, height: 17, display: 'flex' }}>{IC.crown}</span>
                    Назначить лидера
                  </>
                )}
              </button>

              {!selOrg && (
                <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,.2)', marginTop: 10 }}>
                  Сначала выберите организацию
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────
export default function Dashboard({ user, onLogout }) {
  // Статистика по организациям/лидерам/вакансиям теперь считается реально —
  // суммарно по всем подключённым сферам (gov+business+syndicate+bikers+street).
  // blacklist пока нет отдельной таблицы, поэтому оставлен как раньше.
  const [stats, setStats] = useState({ organizations: 0, leaders: 0, vacancies: 0, blacklist: 28 })
  const [loadingStats, setLoadingStats] = useState(true)

  const [activeNode, setActiveNode] = useState('gov')
  const [activeServer, setActiveServer] = useState('Texas') // Выбранный сервер по умолчанию
  const [showAssign, setShowAssign] = useState(false)
  const [now, setNow] = useState(new Date())

  // Данные о лидерах выбранной сферы (для блока "Руководство сферы")
  const [sphereOrgs, setSphereOrgs] = useState([])
  const [loadingLeadership, setLoadingLeadership] = useState(false)

  // Сфера готова, если для неё подключена реальная таблица (см. READY_STAT_SPHERES)
  // И выбран сервер Texas — остальные серверы пока не имеют подключённых таблиц сфер.
  const isSphereReady = activeServer === 'Texas' && READY_STAT_SPHERES.includes(activeNode)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  // Суммарная статистика по всем сферам Texas — считается один раз при монтировании
  // (данные обновляются нечасто, а дергать 5 таблиц на каждый чих не нужно).
  useEffect(() => {
    const loadStats = async () => {
      setLoadingStats(true)
      try {
        const results = await Promise.all(
          READY_STAT_SPHERES.map(sphere => loadOrgsBySphere[sphere]().catch(() => []))
        )
        const all = results.flat()
        const organizations = all.length
        const vacancies = all.filter(o => o.leader === 'Вакантно').length
        const leaders = organizations - vacancies
        setStats(prev => ({ ...prev, organizations, leaders, vacancies }))
      } catch (e) { console.error(e) }
      finally { setLoadingStats(false) }
    }
    loadStats()
  }, [])

  // При смене сферы или сервера подгружаем реальных лидеров сферы (если подключена),
  // иначе просто ничего не грузим — покажется заглушка "в разработке".
  useEffect(() => {
    if (activeNode === 'gov') return
    if (!isSphereReady) { setSphereOrgs([]); return }
    let cancelled = false
    setLoadingLeadership(true)
    loadOrgsBySphere[activeNode]()
      .then(orgs => { if (!cancelled) setSphereOrgs(orgs) })
      .catch(e => console.error(e))
      .finally(() => { if (!cancelled) setLoadingLeadership(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNode, activeServer])

  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })

  const orgGroup = [
    { title: 'Организаций',      value: loadingStats ? '—' : stats.organizations, icon: IC.org,   accent: '56,189,248'  },
    { title: 'Активных лидеров', value: loadingStats ? '—' : stats.leaders,       icon: IC.crown, accent: '251,146,60'  },
    { title: 'Вакансий',         value: loadingStats ? '—' : stats.vacancies,     icon: IC.cross, accent: '251,113,133' },
  ]

  const disciplineGroup = [
    { title: 'Активных запретов',  value: stats.blacklist,  icon: IC.cross,   accent: '248,113,113' },
  ]

  // Получаем правильно склоненные названия ролей руководства на основе текущей сферы
  const { gs: gsLabel, zgs: zgsLabel } = LEADERSHIP_NAMES[activeNode] || { gs: 'ГС', zgs: 'ЗГС' }

  // Руководство выбранной сферы для выбранного сервера
  const currentLeadership = LEADERSHIP_BY_SERVER_AND_SPHERE[activeServer]?.[activeNode] || { gs: null, zgs: null }
  // Оставляем старое имя для минимальных изменений в JSX ниже (блок ГОС использует его напрямую)
  const currentGosLeadership = LEADERSHIP_BY_SERVER_AND_SPHERE[activeServer]?.gov || { gs: null, zgs: null }

  return (
    <div className="text-white min-h-screen" style={{ background: 'radial-gradient(circle at 12% 0%, #1a2440 0%, #0a0e18 50%)' }}>
      <style>{`
        @keyframes db-shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes db-spin     { to{transform:rotate(360deg)} }
        @keyframes db-fadeUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes db-pulse    { 0%,100%{opacity:.3} 50%{opacity:.8} }
        @keyframes db-success  { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        
        /* Стилизация скелетон-эффекта и пульсации для заглушки */
        .skeleton-text {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          animation: db-shimmer 1.6s infinite linear;
          border-radius: 6px;
        }
      `}</style>

      {/* ── STATUS STRIP ───────────────────────────────── */}
      <div className="border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 h-10 flex items-center justify-between text-[11px] font-semibold tracking-wide text-white/35">
          <div className="uppercase">{dateStr}, {timeStr}</div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-10">

        {/* ── HEADER ─────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-orange-300/80 mb-2">Мониторинг системы</div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2 leading-tight">STATECORE</h1>
            <p className="text-slate-400 max-w-lg">Актуальная статистика по организациям, лидерам и дисциплинарным взысканиям</p>
          </div>
          <button
            style={{
              width: 44, height: 44,
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 14, color: 'rgba(255,255,255,.45)',
              cursor: 'pointer', flexShrink: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,140,0,.1)'; e.currentTarget.style.borderColor='rgba(255,140,0,.25)'; e.currentTarget.style.color='#ff8c00' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.05)'; e.currentTarget.style.borderColor='rgba(255,255,255,.08)'; e.currentTarget.style.color='rgba(255,255,255,.45)' }}
            title="Уведомления (скоро)"
          >
            {IC.bell}
          </button>
        </div>

        {/* ── FILTERS (SERVER & FRACTION NODE) ────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8 bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5">
          {/* Серверный дропдаун */}
          <div className="flex flex-col gap-2 min-w-[200px]">
            <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35">Сервер</span>
            <div className="relative">
              <select
                value={activeServer}
                onChange={e => setActiveServer(e.target.value)}
                className="w-full appearance-none bg-white/5 text-slate-200 border border-white/10 hover:border-white/20 px-4 py-2.5 pr-10 rounded-xl text-xs font-bold transition-all duration-150 outline-none cursor-pointer focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                style={{ colorScheme: 'dark' }}
              >
                {SERVERS.map(srv => (
                  <option key={srv} value={srv} className="bg-[#0d1120] text-slate-200 py-2">
                    {srv} {srv === 'Texas'}
                  </option>
                ))}
              </select>
              {/* Кастомная стрелочка для Select */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Фильтр сфер */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35">Сфера фракций</span>
            <div className="flex flex-wrap gap-2">
              {FRACTION_NODES.map(node => {
                const active = activeNode === node.id
                return (
                  <button
                    key={node.id}
                    onClick={() => setActiveNode(node.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                      active
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                        : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {node.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {activeNode === 'gov' ? (
          <>
            {/* ── ORGANIZATIONS ──────────────────────────────── */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">Организации ({activeServer})</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
              {orgGroup.map(card => (
                <div
                  key={card.title}
                  className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${card.accent})` }} />
                  <div className="flex items-center justify-between pl-5 pr-5 py-5">
                    <div>
                      <p className="text-slate-400 text-sm">{card.title}</p>
                      <h2 className="text-3xl font-black mt-1.5 tabular-nums">{card.value}</h2>
                    </div>
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `rgba(${card.accent},.12)`, color: `rgb(${card.accent})` }}
                    >
                      {card.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── DISCIPLINE ──────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">Дисциплина</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
              {disciplineGroup.map(card => (
                <div
                  key={card.title}
                  className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${card.accent})` }} />
                  <div className="flex items-center justify-between pl-5 pr-5 py-5">
                    <div>
                      <p className="text-slate-400 text-sm">{card.title}</p>
                      <h2 className="text-3xl font-black mt-1.5 tabular-nums">{card.value}</h2>
                    </div>
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `rgba(${card.accent},.12)`, color: `rgb(${card.accent})` }}
                    >
                      {card.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── GOS LEADERSHIP (ГС / ЗГС) ───────────────────── */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">Руководство гос. ({activeServer})</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {[
                { role: 'Главный Следящий гос.структур', data: currentGosLeadership.gs, accent: '251,146,60' },
                { role: 'Зам. Главного следящего гос.структур', data: currentGosLeadership.zgs, accent: '56,189,248' },
              ].map(person => (
                <div
                  key={person.role}
                  className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${person.accent})` }} />
                  <div className="flex items-start gap-4 pl-5 pr-5 py-5">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `rgba(${person.accent},.12)`, color: `rgb(${person.accent})` }}
                    >
                      {IC.crown}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold tracking-[1.5px] uppercase" style={{ color: `rgb(${person.accent})` }}>{person.role}</p>
                      {person.data ? (
                        <>
                          <h3 className="text-lg font-black mt-0.5 truncate">{person.data.nickname}</h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                            <LeaderContactLink icon={IC.link} value={person.data.vk} />
                            <LeaderContactLink icon={IC.link} value={person.data.forum} />
                          </div>
                        </>
                      ) : (
                        <h3 className="text-lg font-black mt-0.5 text-slate-400/90 italic">Отсутствует</h3>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── ВРИО ГС — отдельная карточка, не путать с основным ГС ── */}
            {currentGosLeadership.actingGs && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">Временное исполнение обязанностей ({activeServer})</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                  <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'rgb(168,85,247)' }} />
                    <div className="flex items-start gap-4 pl-5 pr-5 py-5">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(168,85,247,.12)', color: 'rgb(168,85,247)' }}
                      >
                        {IC.crown}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[11px] font-extrabold tracking-[1.5px] uppercase" style={{ color: 'rgb(168,85,247)' }}>
                            Главный Следящий гос.структур
                          </p>
                          <span
                            className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider"
                            style={{ background: 'rgba(168,85,247,.15)', color: 'rgb(168,85,247)', border: '1px solid rgba(168,85,247,.35)' }}
                          >
                            ВРИО
                          </span>
                        </div>
                        <h3 className="text-lg font-black mt-0.5 truncate">{currentGosLeadership.actingGs.nickname}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                          <LeaderContactLink icon={IC.link} value={currentGosLeadership.actingGs.vk} />
                          <LeaderContactLink icon={IC.link} value={currentGosLeadership.actingGs.forum} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          /* ── OTHER FRACTION NODES ── */
          <>
            {isSphereReady ? (
              <>
                {/* ── СТАТИСТИКА ПО ВЫБРАННОЙ СФЕРЕ ── */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">
                    {FRACTION_NODES.find(n => n.id === activeNode)?.label} ({activeServer})
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
                  {[
                    { title: 'Организаций',      value: loadingLeadership ? '—' : sphereOrgs.length, icon: IC.org,   accent: '56,189,248'  },
                    { title: 'Активных лидеров', value: loadingLeadership ? '—' : sphereOrgs.filter(o => o.leader !== 'Вакантно').length, icon: IC.crown, accent: '251,146,60'  },
                    { title: 'Вакансий',         value: loadingLeadership ? '—' : sphereOrgs.filter(o => o.leader === 'Вакантно').length,  icon: IC.cross, accent: '251,113,133' },
                  ].map(card => (
                    <div
                      key={card.title}
                      className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${card.accent})` }} />
                      <div className="flex items-center justify-between pl-5 pr-5 py-5">
                        <div>
                          <p className="text-slate-400 text-sm">{card.title}</p>
                          <h2 className="text-3xl font-black mt-1.5 tabular-nums">{card.value}</h2>
                        </div>
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `rgba(${card.accent},.12)`, color: `rgb(${card.accent})` }}
                        >
                          {card.icon}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Отрисовка заблокированной статистики для сфер без подключённой таблицы */
              <div
                className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.015] mb-6"
                style={{ minHeight: 220 }}
              >
                <div className="flex flex-col items-center justify-center text-center px-6 py-16">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-white/5 text-orange-300/80">
                    {IC.shield}
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">
                    {FRACTION_NODES.find(n => n.id === activeNode)?.label} ({activeServer})
                  </h3>
                  <p className="text-sm text-slate-400 max-w-md">
                    {FRACTION_STATUS_TEXT[FRACTION_STATUS]}
                  </p>
                </div>
              </div>
            )}

            {/* Секция руководства для сферы (реальные данные, если назначены — иначе «Отсутствует») */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">Руководство сферы ({activeServer})</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {[
                { role: gsLabel, data: currentLeadership.gs, accent: '251,146,60' },
                { role: zgsLabel, data: currentLeadership.zgs, accent: '56,189,248' },
              ].map((person, index) => (
                <div
                  key={index}
                  className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] transition-all duration-300"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: loadingLeadership ? '#94a3b8' : 'rgb(239, 68, 68)' }} />
                  <div className="flex items-start gap-4 pl-5 pr-5 py-5">
                    
                    {/* Аватарка-корона / спиннер */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ 
                        background: loadingLeadership ? 'rgba(255,255,255,.05)' : 'rgba(239,68,68,.12)', 
                        color: loadingLeadership ? '#94a3b8' : 'rgb(239, 68, 68)' 
                      }}
                    >
                      {loadingLeadership ? (
                        <span className="animation-spin w-5 h-5 flex items-center justify-center" style={{ animation: 'db-spin .8s linear infinite' }}>{IC.spin}</span>
                      ) : (
                        IC.crown
                      )}
                    </div>

                    <div className="min-w-0 w-full">
                      {/* Роль (например: ГС байкеров) */}
                      <p 
                        className="text-[11px] font-extrabold tracking-[1.5px] uppercase transition-all duration-300" 
                        style={{ color: loadingLeadership ? '#94a3b8' : 'rgb(239,68,68)' }}
                      >
                        {person.role}
                      </p>

                      {/* Состояние загрузки / реальные данные / «Отсутствует» */}
                      {loadingLeadership ? (
                        <div className="space-y-2 mt-2.5">
                          {/* Плейсхолдер для Ника */}
                          <div className="skeleton-text h-5 w-40" />
                          {/* Плейсхолдеры для соц. сетей */}
                          <div className="flex gap-4 pt-1">
                            <div className="skeleton-text h-3.5 w-24" />
                            <div className="skeleton-text h-3.5 w-24" />
                          </div>
                        </div>
                      ) : person.data ? (
                        <div className="animation-fadeUp" style={{ animation: 'db-fadeUp .4s ease both' }}>
                          <h3 className="text-lg font-black mt-0.5 truncate">{person.data.nickname}</h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                            <LeaderContactLink icon={IC.link} value={person.data.vk} />
                            <LeaderContactLink icon={IC.link} value={person.data.forum} />
                          </div>
                        </div>
                      ) : (
                        <div className="animation-fadeUp" style={{ animation: 'db-fadeUp .4s ease both' }}>
                          <h3 className="text-lg font-black mt-0.5 text-slate-400/90 italic">Отсутствует</h3>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── QUICK ACTIONS ───────────────────────────────── */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">Быстрые действия ({activeServer})</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-10">

          {/* ASSIGN LEADER — opens modal */}
          <button
            onClick={() => setShowAssign(true)}
            className="group relative overflow-hidden rounded-xl p-6 text-left transition-all duration-300 bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 hover:scale-[1.01] shadow-lg shadow-orange-500/20"
          >
            <div className="text-orange-900 mb-3">{IC.crown}</div>
            <h3 className="font-black text-xl mb-1">Назначить лидера</h3>
            <p className="text-white/80 text-sm">Быстрое назначение на должность</p>
          </button>

          {/* BLACKLIST */}
          <button className="group relative overflow-hidden rounded-xl p-6 text-left transition-all duration-300 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-500/20 hover:bg-gradient-to-br hover:from-red-500 hover:to-pink-600 hover:text-white hover:scale-[1.01]">
            <div className="text-red-300 mb-3 transition group-hover:text-white">{IC.cross}</div>
            <h3 className="font-black text-xl mb-1">Внести в реестр запретов</h3>
            <p className="text-sm text-slate-300 group-hover:text-white/80">Запреты на вступление в гос.организации</p>
          </button>

        </div>

      </div>

      {/* MODAL */}
      {showAssign && <AssignLeaderModal onClose={() => setShowAssign(false)} />}
    </div>
  )
}