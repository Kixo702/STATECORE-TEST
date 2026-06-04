import { useState } from 'react'
import banner from '../assets/banner.png'

export default function Dashboard({ user, onLogout }) {

  const [stats] = useState({
    organizations: 12,
    leaders: 9,
    vacancies: 3,
    strictWarns: 7,
    oralWarns: 14,
    blacklist: 28
  })

  const recentActions = [
    { admin: 'Robert_Kamiya', action: 'Выдал строгий выговор', target: 'LSPD', time: '13:42' },
    { admin: 'Robert_Kamiya', action: 'Назначил лидера', target: 'FBI', time: '12:17' },
    { admin: 'Robert_Kamiya', action: 'Добавил запрет', target: 'Nick_Ross', time: '11:05' },
    { admin: 'Robert_Kamiya', action: 'Снял лидера', target: 'LSMC', time: '10:28' }
  ]

  const Icons = {
    org: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
        <path d="M4 21V7l8-4 8 4v14" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 21v-8h6v8" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
    crown: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
        <path d="M3 7l4 5 5-6 5 6 4-5v10H3V7z" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
    cross: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
        <path d="M12 3l9 18H3l9-18z" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    )
  }

  const statCards = [
    { title: 'Организаций', value: stats.organizations, icon: Icons.org, color: 'text-blue-400' },
    { title: 'Активных лидеров', value: stats.leaders, icon: Icons.crown, color: 'text-orange-400' },
    { title: 'Ваканток', value: stats.vacancies, icon: Icons.cross, color: 'text-red-400' },
    { title: 'Строгих выговоров', value: stats.strictWarns, icon: Icons.warning, color: 'text-yellow-400' },
    { title: 'Устных выговоров', value: stats.oralWarns, icon: Icons.warning, color: 'text-slate-300' },
    { title: 'Запретов', value: stats.blacklist, icon: Icons.cross, color: 'text-red-500' }
  ]

  return (
    <div className="text-white bg-[#0b0f19] min-h-screen">
 
      {/* BANNER HEADER */}
      <div className="w-full bg-[#0b0f19] pt-4 pb-2 border-b border-white/5">
        <div className="px-8">
          
          <div className="relative w-full max-h-[140px] overflow-hidden rounded-2xl">

            <img
              src={banner}
              alt="banner"
              className="w-full object-contain block"
            />

            {/* GRADIENT FADE BOTTOM */}
            <div className="
              absolute bottom-0 left-0 w-full h-20
              bg-gradient-to-t from-[#0b0f19] to-transparent
              pointer-events-none
            " />

          </div>

        </div>
      </div>

      {/* PAGE CONTENT */}
      <div className="px-4 sm:px-6 md:px-10 py-10 mt-2">

        {/* HEADER */}
        <div className="mb-10" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2">
              Мониторинг системы
            </h1>
            <p className="text-slate-400">
              Актуальная статистика государственных структур
            </p>
          </div>

          {/* User profile chip */}
          {user && (
            <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
              <div style={{
                display:'flex', alignItems:'center', gap:12,
                background:'linear-gradient(135deg, rgba(255,140,0,.1) 0%, rgba(255,100,0,.06) 100%)',
                border:'1px solid rgba(255,140,0,.2)', borderRadius:16, padding:'10px 16px',
                boxShadow:'0 4px 20px rgba(255,140,0,.1)',
              }}>
                <div style={{
                  width:36, height:36, borderRadius:10, flexShrink:0,
                  background:'linear-gradient(135deg, #ff8c00 0%, #e06000 100%)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:15, fontWeight:900, color:'#fff',
                  boxShadow:'0 4px 12px rgba(255,140,0,.35)',
                }}>
                  {(user.nickname || user.login || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:'#e8edf3', lineHeight:1.1, marginBottom:2 }}>
                    {user.nickname || user.login}
                  </div>
                  <div style={{ fontSize:11, color:'rgba(255,140,0,.85)', fontWeight:600, letterSpacing:'0.3px' }}>
                    {user.roleName || 'Следящий'}
                  </div>
                </div>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  style={{
                    background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)',
                    color:'rgba(255,255,255,.45)', padding:'10px 16px', borderRadius:12,
                    fontSize:12, fontWeight:700, cursor:'pointer', letterSpacing:'0.3px',
                    transition:'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(232,80,80,.4)'; e.currentTarget.style.color='#e85050'; e.currentTarget.style.background='rgba(232,80,80,.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,.1)'; e.currentTarget.style.color='rgba(255,255,255,.45)'; e.currentTarget.style.background='rgba(255,255,255,.05)' }}
                >
                  Выйти
                </button>
              )}
            </div>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">

          {statCards.map((card) => (
            <div
              key={card.title}
              className="
                bg-[#111827]
                border border-white/5
                rounded-3xl
                p-6
                hover:border-orange-500/20
                hover:shadow-xl
                transition-all
                duration-300
              "
            >
              <div className="flex items-center justify-between">

                <div>
                  <p className="text-slate-400 text-sm">
                    {card.title}
                  </p>

                  <h2 className="text-4xl font-black mt-2">
                    {card.value}
                  </h2>
                </div>

                <div className={`p-3 rounded-xl bg-white/5 ${card.color}`}>
                  {card.icon}
                </div>

              </div>
            </div>
          ))}

        </div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

          {/* HERO ACTION */}
          <button className="
            group relative overflow-hidden
            rounded-3xl p-6 text-left
            transition-all duration-300
            bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600
            hover:scale-[1.02]
            shadow-lg shadow-orange-500/20
          ">
            <div className="text-orange-900 mb-3">
              {Icons.crown}
            </div>

            <h3 className="font-black text-xl mb-1">
              Назначить лидера
            </h3>

            <p className="text-white/80 text-sm">
              Быстрое назначение на должность
            </p>
          </button>

          {/* DANGER ACTION */}
          <button className="
            group relative overflow-hidden
            rounded-3xl p-6 text-left
            transition-all duration-300
            bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent
            border border-red-500/20
            hover:bg-gradient-to-br hover:from-red-500 hover:to-pink-600
            hover:text-white
            hover:scale-[1.02]
          ">
            <div className="text-red-400 mb-3 transition group-hover:text-white">
              {Icons.cross}
            </div>

            <h3 className="font-black text-xl mb-1">
              Внести в реестр запретов
            </h3>

            <p className="text-sm text-slate-300 group-hover:text-white/80">
              Запреты на вступление в гос.организации
            </p>
          </button>

        </div>

        {/* ACTIVITY */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-6">

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black">
              Последние действия
            </h2>

            <button className="text-blue-400 hover:text-blue-300 transition">
              Все логи →
            </button>
          </div>

          <div className="space-y-4">

            {recentActions.map((log, index) => (
              <div
                key={index}
                className="
                  flex items-center justify-between
                  bg-black/20
                  rounded-2xl p-4
                  hover:bg-black/30
                  hover:translate-x-1
                  transition-all
                "
              >
                <div>
                  <h4 className="font-bold">
                    {log.admin}
                  </h4>
                  <p className="text-slate-400 text-sm">
                    {log.action}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-semibold">
                    {log.target}
                  </p>
                  <span className="text-xs text-slate-500">
                    {log.time}
                  </span>
                </div>
              </div>
            ))}

          </div>

        </div>

      </div>
    </div>
  )
}