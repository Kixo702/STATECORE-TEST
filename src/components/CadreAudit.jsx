import { useState, useEffect, useCallback } from 'react'
import {
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  ShieldAlert,
  Send,
  FileText,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { getCadreAudits, createCadreAudit, approveCadreAudit, rejectCadreAudit } from '../lib/api'

// Приводим дату из бэкенда (ISO-строка) к читаемому виду
function formatDate(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString('ru-RU', { hour12: false }).slice(0, 16)
  } catch {
    return value
  }
}

const FACTIONS = [
  'Правительство', 'FBI', 'LSPD', 'SFPD', 'LVPD',
  'Армия (National Guard)', 'MCLS', 'MCSF', 'MCLV', 'Радио 24'
]

// Акцентный цвет карточки в зависимости от статуса заявки (в стиле Dashboard: rgb(...) для фона/бордера)
const STATUS_ACCENT = {
  PENDING:  '245,158,11',
  APPROVED: '34,197,94',
  REJECTED: '239,68,68',
}

export default function CadreAudit({ user }) {
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'history' | 'create'
  const [audits, setAudits] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFaction, setSelectedFaction] = useState('ALL')

  // Состояние загрузки списка из БД
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  // Состояние отправки формы / одобрения / отказа (чтобы блокировать повторные клики)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [pendingActionId, setPendingActionId] = useState(null)

  // Модальное окно для отказа
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectAuditId, setRejectAuditId] = useState(null)
  const [rejectReasonText, setRejectReasonText] = useState('')

  // Форма отправки
  const [formData, setFormData] = useState({
    candidateNick: '',
    faction: FACTIONS[0],
    currentRank: 0,
    targetRank: 9,
    reason: 'Доверенное лицо',
    proofUrl: '',
    vkUrl: '',
  })

  // Загрузка заявок из БД
  const loadAudits = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await getCadreAudits()
      setAudits(data)
    } catch (err) {
      console.error('Не удалось загрузить заявки кадрового аудита:', err)
      setLoadError(err.message || 'Не удалось загрузить заявки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAudits()
  }, [loadAudits])

  // Обработка подачи заявки
  const handleSubmitNewAudit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await createCadreAudit(formData)
      setAudits(prev => [created, ...prev])
      setActiveTab('pending')
      setFormData({
        candidateNick: '',
        faction: FACTIONS[0],
        currentRank: 0,
        targetRank: 9,
        reason: 'Доверенное лицо',
        proofUrl: '',
        vkUrl: '',
      })
    } catch (err) {
      console.error('Не удалось создать заявку кадрового аудита:', err)
      setSubmitError(err.message || 'Не удалось отправить заявку')
    } finally {
      setSubmitting(false)
    }
  }

  // Одобрение заявки
  const handleApprove = async (id) => {
    setPendingActionId(id)
    setSubmitError(null)
    try {
      const updated = await approveCadreAudit(id)
      setAudits(prev => prev.map(item => (item.id === id ? updated : item)))
    } catch (err) {
      console.error('Не удалось одобрить заявку:', err)
      setSubmitError(err.message || 'Не удалось одобрить заявку')
    } finally {
      setPendingActionId(null)
    }
  }

  // Открытие модалки отказа
  const openRejectModal = (id) => {
    setRejectAuditId(id)
    setRejectReasonText('')
    setRejectModalOpen(true)
  }

  // Подтверждение отказа
  const handleConfirmReject = async () => {
    if (!rejectReasonText.trim()) return
    setPendingActionId(rejectAuditId)
    setSubmitError(null)
    try {
      const updated = await rejectCadreAudit(rejectAuditId, rejectReasonText.trim())
      setAudits(prev => prev.map(item => (item.id === rejectAuditId ? updated : item)))
      setRejectModalOpen(false)
      setRejectAuditId(null)
    } catch (err) {
      console.error('Не удалось отклонить заявку:', err)
      setSubmitError(err.message || 'Не удалось отклонить заявку')
    } finally {
      setPendingActionId(null)
    }
  }

  // Фильтрация
  const filteredAudits = audits.filter(item => {
    const matchesTab =
      activeTab === 'pending' ? item.status === 'PENDING' :
      activeTab === 'history' ? item.status !== 'PENDING' : true

    const matchesSearch = item.candidateNick.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.submittedBy.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFaction = selectedFaction === 'ALL' || item.faction === selectedFaction

    return matchesTab && matchesSearch && matchesFaction
  })

  const pendingCount = audits.filter(a => a.status === 'PENDING').length

  return (
    <div className="text-white min-h-screen" style={{ background: 'radial-gradient(circle at 12% 0%, #1a2440 0%, #0a0e18 50%)' }}>
      <style>{`
        @keyframes ca-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes ca-fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-10">

        {/* ── HEADER ─────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-orange-300/80 mb-2 flex items-center gap-2">
              <UserPlus className="w-3.5 h-3.5" /> Кадровый аудит
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2 leading-tight">Кадровый Аудит / Антиблат</h1>
            <p className="text-slate-400 max-w-lg">Система учёта, проверки и логирования назначений старшего состава (7–9 ранги)</p>
          </div>

          {/* Вкладки */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" /> Ожидают ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" /> История
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-2 ${
                activeTab === 'create'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" /> Подать заявку
            </button>
          </div>
        </div>

        {/* ── ПАНЕЛЬ ПОИСКА И ФИЛЬТРОВ ──────────────────── */}
        {activeTab !== 'create' && (
          <div className="flex items-center justify-between flex-wrap gap-4 mb-8 bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col gap-2 flex-1 min-w-[240px]">
              <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35">Поиск</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Поиск по нику или лидеру..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 text-slate-200 border border-white/10 hover:border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold transition-all duration-150 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 min-w-[200px]">
              <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35">Фракция</span>
              <div className="relative">
                <select
                  value={selectedFaction}
                  onChange={(e) => setSelectedFaction(e.target.value)}
                  className="w-full appearance-none bg-white/5 text-slate-200 border border-white/10 hover:border-white/20 px-4 py-2.5 pr-10 rounded-xl text-xs font-bold transition-all duration-150 outline-none cursor-pointer focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="ALL" className="bg-[#0d1120] text-slate-200">Все фракции</option>
                  {FACTIONS.map(f => (
                    <option key={f} value={f} className="bg-[#0d1120] text-slate-200">{f}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ОШИБКА ДЕЙСТВИЯ (одобрение/отказ/отправка) ──── */}
        {submitError && (
          <div className="mb-6 flex items-center gap-2.5 bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-bold rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {submitError}
          </div>
        )}

        {/* ── ФОРМА ПОДАЧИ ЗАЯВКИ ────────────────────────── */}
        {activeTab === 'create' && (
          <form
            onSubmit={handleSubmitNewAudit}
            className="relative overflow-hidden bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-5 max-w-3xl mx-auto"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #ff8c00, #ff5500, #ff8c00)' }} />

            <h2 className="text-lg font-black text-white border-b border-white/5 pb-4 flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(52,211,153,.12)', color: 'rgb(52,211,153)' }}>
                <Send className="w-4 h-4" />
              </span>
              Форма назначения / повышения кандидата
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold tracking-[1.5px] uppercase text-white/35 mb-1.5">Никнейм кандидата</label>
                <input
                  required
                  type="text"
                  placeholder="Miyamoto_Musashi"
                  value={formData.candidateNick}
                  onChange={(e) => setFormData({ ...formData, candidateNick: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all duration-150 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold tracking-[1.5px] uppercase text-white/35 mb-1.5">Фракция</label>
                <select
                  value={formData.faction}
                  onChange={(e) => setFormData({ ...formData, faction: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all duration-150 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  style={{ colorScheme: 'dark' }}
                >
                  {FACTIONS.map(f => (
                    <option key={f} value={f} className="bg-[#0d1120] text-slate-200">{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold tracking-[1.5px] uppercase text-white/35 mb-1.5">Текущий ранг</label>
                <input
                  required
                  type="number"
                  min="0"
                  max="9"
                  value={formData.currentRank}
                  onChange={(e) => setFormData({ ...formData, currentRank: Number(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all duration-150 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold tracking-[1.5px] uppercase text-white/35 mb-1.5">Назначаемый ранг</label>
                <input
                  required
                  type="number"
                  min="7"
                  max="9"
                  value={formData.targetRank}
                  onChange={(e) => setFormData({ ...formData, targetRank: Number(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all duration-150 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold tracking-[1.5px] uppercase text-white/35 mb-1.5">Причина назначения</label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all duration-150 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="Доверенное лицо" className="bg-[#0d1120] text-slate-200">Доверенное лицо</option>
                  <option value="Отчёт / Система повышений" className="bg-[#0d1120] text-slate-200">Отчёт / Система повышений</option>
                  <option value="Обзвон" className="bg-[#0d1120] text-slate-200">Обзвон</option>
                  <option value="Восстановление / Перевод" className="bg-[#0d1120] text-slate-200">Восстановление / Перевод</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold tracking-[1.5px] uppercase text-white/35 mb-1.5">Ссылка на VK кандидата</label>
                <input
                  required
                  type="url"
                  placeholder="https://vk.com/..."
                  value={formData.vkUrl}
                  onChange={(e) => setFormData({ ...formData, vkUrl: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all duration-150 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold tracking-[1.5px] uppercase text-white/35 mb-1.5">Ссылка на док-ва / заявку / форум</label>
              <input
                required
                type="url"
                placeholder="https://forum.gta-mobile.ru/threads/..."
                value={formData.proofUrl}
                onChange={(e) => setFormData({ ...formData, proofUrl: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all duration-150 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 hover:scale-[1.01] disabled:opacity-60 disabled:hover:scale-100 text-white font-black rounded-xl transition-all duration-300 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Отправка...' : 'Отправить на проверку следящим'}
            </button>
          </form>
        )}

        {/* ── СПИСОК КАРТОЧЕК (PENDING / HISTORY) ────────── */}
        {activeTab !== 'create' && loading && (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white/[0.015] border border-white/[0.08] rounded-2xl flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
            Загрузка заявок из базы данных...
          </div>
        )}

        {activeTab !== 'create' && !loading && loadError && (
          <div className="col-span-full py-12 text-center bg-rose-500/[0.04] border border-rose-500/20 rounded-2xl flex flex-col items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
            <p className="text-rose-300 text-sm font-bold">{loadError}</p>
            <button
              onClick={loadAudits}
              className="px-4 py-2 bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl text-xs font-bold transition-all duration-150"
            >
              Повторить
            </button>
          </div>
        )}

        {activeTab !== 'create' && !loading && !loadError && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAudits.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 bg-white/[0.015] border border-white/[0.08] rounded-2xl">
                Никаких записей не найдено.
              </div>
            ) : (
              filteredAudits.map((audit) => {
                const accent = STATUS_ACCENT[audit.status] || '148,163,184'
                return (
                  <div
                    key={audit.id}
                    className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200 flex flex-col justify-between"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${accent})` }} />

                    <div className="pl-5 pr-5 pt-5">
                      {/* Верх карточки: Ник + Статус */}
                      <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `rgba(${accent},.12)`, color: `rgb(${accent})` }}
                          >
                            <UserPlus className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-black text-white flex items-center gap-2 flex-wrap">
                              {audit.candidateNick}
                              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                                {audit.faction}
                              </span>
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                              Подал: <span className="text-slate-200">{audit.submittedBy}</span> • {formatDate(audit.submittedAt)}
                            </p>
                          </div>
                        </div>

                        {/* Badge Статуса */}
                        {audit.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide shrink-0" style={{ background: 'rgba(245,158,11,.1)', color: 'rgb(245,158,11)', border: '1px solid rgba(245,158,11,.25)' }}>
                            <Clock className="w-3.5 h-3.5" /> На проверке
                          </span>
                        )}
                        {audit.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide shrink-0" style={{ background: 'rgba(34,197,94,.1)', color: 'rgb(34,197,94)', border: '1px solid rgba(34,197,94,.25)' }}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Одобрено
                          </span>
                        )}
                        {audit.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide shrink-0" style={{ background: 'rgba(239,68,68,.1)', color: 'rgb(239,68,68)', border: '1px solid rgba(239,68,68,.25)' }}>
                            <XCircle className="w-3.5 h-3.5" /> Отклонено
                          </span>
                        )}
                      </div>

                      {/* Детали рангов и причины */}
                      <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                        <div className="bg-white/[0.03] border border-white/[0.08] p-2.5 rounded-xl">
                          <span className="text-slate-400 block text-[10px] font-extrabold uppercase tracking-wide mb-0.5">Повышение</span>
                          <span className="text-white font-bold">{audit.currentRank} ➔ {audit.targetRank} ранг</span>
                        </div>
                        <div className="bg-white/[0.03] border border-white/[0.08] p-2.5 rounded-xl">
                          <span className="text-slate-400 block text-[10px] font-extrabold uppercase tracking-wide mb-0.5">Причина</span>
                          <span className="text-white font-bold">{audit.reason}</span>
                        </div>
                      </div>

                      {/* Ссылки */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs mt-2">
                        {audit.proofUrl && (
                          <a
                            href={audit.proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-orange-300/90 hover:text-orange-300 hover:underline inline-flex items-center gap-1.5"
                          >
                            Доказательства <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {audit.vkUrl && (
                          <a
                            href={audit.vkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-orange-300/90 hover:text-orange-300 hover:underline inline-flex items-center gap-1.5"
                          >
                            VK кандидата <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* Лог проверки */}
                      {audit.status !== 'PENDING' && (
                        <div className="mt-3 pt-3 border-t border-white/5 text-xs text-slate-400 pb-1">
                          Проверил: <span className="text-slate-200">{audit.reviewedBy}</span>
                          {audit.rejectReason && (
                            <p className="mt-1.5 p-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.18)', color: 'rgba(255,255,255,.55)' }}>
                              Причина отказа: {audit.rejectReason}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Действия для следящих */}
                    {audit.status === 'PENDING' && (
                      <div className="flex gap-2 p-4 pt-3 mt-2 border-t border-white/5">
                        <button
                          onClick={() => handleApprove(audit.id)}
                          disabled={pendingActionId === audit.id}
                          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50"
                          style={{ background: 'rgba(34,197,94,.1)', color: 'rgb(34,197,94)', border: '1px solid rgba(34,197,94,.25)' }}
                          onMouseEnter={e => { if (pendingActionId !== audit.id) { e.currentTarget.style.background = 'rgb(34,197,94)'; e.currentTarget.style.color = '#fff' } }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,.1)'; e.currentTarget.style.color = 'rgb(34,197,94)' }}
                        >
                          {pendingActionId === audit.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Одобрить
                        </button>
                        <button
                          onClick={() => openRejectModal(audit.id)}
                          disabled={pendingActionId === audit.id}
                          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50"
                          style={{ background: 'rgba(239,68,68,.1)', color: 'rgb(239,68,68)', border: '1px solid rgba(239,68,68,.25)' }}
                          onMouseEnter={e => { if (pendingActionId !== audit.id) { e.currentTarget.style.background = 'rgb(239,68,68)'; e.currentTarget.style.color = '#fff' } }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,.1)'; e.currentTarget.style.color = 'rgb(239,68,68)' }}
                        >
                          <XCircle className="w-4 h-4" /> Отказать
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* ── МОДАЛКА ОТКАЗА ─────────────────────────────── */}
      {rejectModalOpen && (
        <div
          onClick={(e) => e.target === e.currentTarget && setRejectModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(14px)' }}
        >
          <div
            className="w-full max-w-md relative overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #141b2e 0%, #0d1120 100%)',
              border: '1px solid rgba(255,255,255,.09)',
              borderRadius: 28,
              boxShadow: '0 40px 100px rgba(0,0,0,.75), 0 0 0 1px rgba(239,68,68,.06), inset 0 1px 0 rgba(255,255,255,.06)',
            }}
          >
            <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #ef4444, #f43f5e, #ef4444)', backgroundSize: '200% 100%', animation: 'ca-shimmer 3s linear infinite' }} />

            <div className="p-6 sm:p-7 space-y-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,.12)', color: 'rgb(239,68,68)' }}>
                  <ShieldAlert className="w-4.5 h-4.5" />
                </span>
                Укажите причину отказа
              </h3>
              <textarea
                rows={3}
                placeholder="Например: Недостаточно доказательств работы / КД на повышение..."
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none transition-all duration-150 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setRejectModalOpen(false)}
                  disabled={pendingActionId === rejectAuditId}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl text-xs font-bold transition-all duration-150 disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={pendingActionId === rejectAuditId}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all duration-150 flex items-center gap-1.5 disabled:opacity-60"
                  style={{ background: 'rgb(239,68,68)' }}
                  onMouseEnter={e => { if (pendingActionId !== rejectAuditId) e.currentTarget.style.background = 'rgb(220,38,38)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgb(239,68,68)' }}
                >
                  {pendingActionId === rejectAuditId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Подтвердить отказ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}