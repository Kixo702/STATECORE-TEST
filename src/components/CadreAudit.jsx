import { useState } from 'react'
import { 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  ExternalLink, 
  ShieldAlert, 
  Send,
  FileText
} from 'lucide-react'

// Моковые данные для стартовой демонстрации
const INITIAL_AUDITS = [
  {
    id: 'cadre-1',
    candidateNick: 'Miyamoto_Musashi',
    faction: 'LSPD',
    currentRank: 8,
    targetRank: 9,
    reason: 'Доверенное лицо',
    proofUrl: 'https://forum.gta-mobile.ru/threads/123456/',
    vkUrl: 'https://vk.com/id1',
    status: 'PENDING', // PENDING | APPROVED | REJECTED
    submittedBy: 'Danila_Leader',
    submittedAt: '2026-07-21 14:30',
    reviewedBy: null,
    rejectReason: null,
  },
  {
    id: 'cadre-2',
    candidateNick: 'John_Dillinger',
    faction: 'FBI',
    currentRank: 6,
    targetRank: 7,
    reason: 'Отчёт',
    proofUrl: 'https://forum.gta-mobile.ru/threads/654321/',
    vkUrl: 'https://vk.com/id2',
    status: 'APPROVED',
    submittedBy: 'Agent_Smith',
    submittedAt: '2026-07-20 18:15',
    reviewedBy: 'Glavny_Sledyaschiy',
    rejectReason: null,
  }
]

const FACTIONS = [
  'Правительство', 'FBI', 'LSPD', 'SFPD', 'LVPD', 
  'Армия (National Guard)', 'MCLS', 'MCSF', 'MCLV', 'Радио 24'
]

export default function CadreAudit({ user }) {
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'history' | 'create'
  const [audits, setAudits] = useState(INITIAL_AUDITS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFaction, setSelectedFaction] = useState('ALL')

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

  // Обработка подачи заявки
  const handleSubmitNewAudit = (e) => {
    e.preventDefault()
    const newEntry = {
      id: `cadre-${Date.now()}`,
      ...formData,
      status: 'PENDING',
      submittedBy: user?.nickname || user?.name || 'Лидер',
      submittedAt: new Date().toLocaleString('ru-RU', { hour12: false }).slice(0, 16),
      reviewedBy: null,
      rejectReason: null,
    }

    setAudits([newEntry, ...audits])
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
  }

  // Одобрение заявки
  const handleApprove = (id) => {
    setAudits(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: 'APPROVED',
          reviewedBy: user?.nickname || user?.name || 'Следящий'
        }
      }
      return item
    }))
  }

  // Открытие модалки отказа
  const openRejectModal = (id) => {
    setRejectAuditId(id)
    setRejectReasonText('')
    setRejectModalOpen(true)
  }

  // Подтверждение отказа
  const handleConfirmReject = () => {
    if (!rejectReasonText.trim()) return
    setAudits(prev => prev.map(item => {
      if (item.id === rejectAuditId) {
        return {
          ...item,
          status: 'REJECTED',
          reviewedBy: user?.nickname || user?.name || 'Следящий',
          rejectReason: rejectReasonText
        }
      }
      return item
    }))
    setRejectModalOpen(false)
    setRejectAuditId(null)
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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Шапка */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0D1322] p-5 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserPlus className="w-7 h-7 text-blue-500" />
            Кадровый Аудит / Антиблат
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Система учета, проверки и логирования назначений старшего состава (7–9 ранги)
          </p>
        </div>

        {/* Вкладки */}
        <div className="flex bg-[#151D30] p-1 rounded-xl border border-slate-700/60 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            Ожидают ({audits.filter(a => a.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            История
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              activeTab === 'create'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Подать заявку
          </button>
        </div>
      </div>

      {/* Панель поиска и фильтров (если мы не на форме) */}
      {activeTab !== 'create' && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по нику или лидеру..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0D1322] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <select
            value={selectedFaction}
            onChange={(e) => setSelectedFaction(e.target.value)}
            className="w-full md:w-auto bg-[#0D1322] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
          >
            <option value="ALL">Все фракции</option>
            {FACTIONS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      )}

      {/* ФОРМА ПОДАЧИ */}
      {activeTab === 'create' && (
        <form onSubmit={handleSubmitNewAudit} className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 space-y-5 max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-400" /> Форма назначения / повышения кандидата
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Никнейм кандидата (Nick_Name)</label>
              <input
                required
                type="text"
                placeholder="Miyamoto_Musashi"
                value={formData.candidateNick}
                onChange={(e) => setFormData({ ...formData, candidateNick: e.target.value })}
                className="w-full bg-[#151D30] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Фракция</label>
              <select
                value={formData.faction}
                onChange={(e) => setFormData({ ...formData, faction: e.target.value })}
                className="w-full bg-[#151D30] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {FACTIONS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Текущий ранг</label>
              <input
                required
                type="number"
                min="0"
                max="9"
                value={formData.currentRank}
                onChange={(e) => setFormData({ ...formData, currentRank: Number(e.target.value) })}
                className="w-full bg-[#151D30] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Назначаемый ранг</label>
              <input
                required
                type="number"
                min="7"
                max="9"
                value={formData.targetRank}
                onChange={(e) => setFormData({ ...formData, targetRank: Number(e.target.value) })}
                className="w-full bg-[#151D30] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Причина назначения</label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full bg-[#151D30] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Доверенное лицо">Доверенное лицо</option>
                <option value="Отчёт / Система повышений">Отчёт / Система повышений</option>
                <option value="Обзвон">Обзвон</option>
                <option value="Восстановление / Перевод">Восстановление / Перевод</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Ссылка на VK кандидатов</label>
              <input
                required
                type="url"
                placeholder="https://vk.com/..."
                value={formData.vkUrl}
                onChange={(e) => setFormData({ ...formData, vkUrl: e.target.value })}
                className="w-full bg-[#151D30] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Ссылка на док-ва / заявку / форум</label>
            <input
              required
              type="url"
              placeholder="https://forum.gta-mobile.ru/threads/..."
              value={formData.proofUrl}
              onChange={(e) => setFormData({ ...formData, proofUrl: e.target.value })}
              className="w-full bg-[#151D30] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" /> Отправить на проверку следящим
          </button>
        </form>
      )}

      {/* СПИСОК КАРТОЧЕК (PENDING / HISTORY) */}
      {activeTab !== 'create' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAudits.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-[#0D1322] rounded-2xl border border-slate-800">
              Никаких записей не найдено.
            </div>
          ) : (
            filteredAudits.map((audit) => (
              <div 
                key={audit.id} 
                className="bg-[#0D1322] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
              >
                <div>
                  {/* Верх карточки: Ник + Статус */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        {audit.candidateNick}
                        <span className="text-xs font-normal text-slate-400 bg-[#151D30] px-2 py-0.5 rounded-md border border-slate-700/50">
                          {audit.faction}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Подал: <span className="text-slate-200">{audit.submittedBy}</span> • {audit.submittedAt}
                      </p>
                    </div>

                    {/* Badge Статуса */}
                    {audit.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-3.5 h-3.5" /> На проверке
                      </span>
                    )}
                    {audit.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Одобрено
                      </span>
                    )}
                    {audit.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <XCircle className="w-3.5 h-3.5" /> Отклонено
                      </span>
                    )}
                  </div>

                  {/* Детали рангов и причины */}
                  <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                    <div className="bg-[#151D30] p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block">Повышение:</span>
                      <span className="text-white font-semibold">{audit.currentRank} ➔ {audit.targetRank} ранг</span>
                    </div>
                    <div className="bg-[#151D30] p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block">Причина:</span>
                      <span className="text-white font-semibold">{audit.reason}</span>
                    </div>
                  </div>

                  {/* Ссылки */}
                  <div className="flex items-center gap-3 text-xs mt-2">
                    {audit.proofUrl && (
                      <a 
                        href={audit.proofUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        Доказательства <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {audit.vkUrl && (
                      <a 
                        href={audit.vkUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        VK Кандидата <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Лог проверки */}
                  {audit.status !== 'PENDING' && (
                    <div className="mt-3 pt-3 border-t border-slate-800/60 text-xs text-slate-400">
                      Проверил: <span className="text-slate-200">{audit.reviewedBy}</span>
                      {audit.rejectReason && (
                        <p className="text-rose-400/90 mt-1 bg-rose-950/20 p-2 rounded-lg border border-rose-900/30">
                          Причина отказа: {audit.rejectReason}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Действия для следящих */}
                {audit.status === 'PENDING' && (
                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleApprove(audit.id)}
                      className="flex-1 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Одобрить
                    </button>
                    <button
                      onClick={() => openRejectModal(audit.id)}
                      className="flex-1 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Отказать
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* МОДАЛКА ОТКАЗА */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" /> Укажите причину отказа
            </h3>
            <textarea
              rows={3}
              placeholder="Например: Недостаточно доказательств работы / КД на повышение..."
              value={rejectReasonText}
              onChange={(e) => setRejectReasonText(e.target.value)}
              className="w-full bg-[#151D30] border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-500 rounded-xl text-xs font-medium"
              >
                Подтвердить отказ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}