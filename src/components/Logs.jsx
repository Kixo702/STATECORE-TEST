 import { useState } from 'react'

export default function Logs() {

  const [search, setSearch] = useState('')

  const logs = [
    {
      type: 'warn',
      admin: 'Robert_Kamiya',
      action: 'Выдал строгий выговор',
      target: 'LSPD',
      date: '03.06.2026 14:22'
    },

    {
      type: 'leader',
      admin: 'Robert_Kamiya',
      action: 'Назначил лидера',
      target: 'FBI',
      date: '03.06.2026 13:01'
    },

    {
      type: 'blacklist',
      admin: 'Robert_Kamiya',
      action: 'Добавил игрока в blacklist',
      target: 'Nick_Ross',
      date: '03.06.2026 12:44'
    },

    {
      type: 'remove',
      admin: 'Robert_Kamiya',
      action: 'Снял лидера',
      target: 'LSMC',
      date: '03.06.2026 11:16'
    }
  ]

  const filteredLogs = logs.filter((log) =>
    log.target
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const getTypeColor = (type) => {

    switch(type) {

      case 'warn':
        return 'border-red-500/20 bg-red-500/10'

      case 'leader':
        return 'border-emerald-500/20 bg-emerald-500/10'

      case 'blacklist':
        return 'border-orange-500/20 bg-orange-500/10'

      case 'remove':
        return 'border-slate-500/20 bg-slate-500/10'

      default:
        return 'border-white/10 bg-white/5'
    }
  }

  const getTypeIcon = (type) => {

    switch(type) {

      case 'warn':
        return '⚠️'

      case 'leader':
        return '👑'

      case 'blacklist':
        return '⛔'

      case 'remove':
        return '❌'

      default:
        return '📜'
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">

      {/* Header */}

      <div className="mb-10">

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2">
          Логи системы
        </h1>

        <p className="text-slate-400">
          История действий следящей администрации
        </p>

      </div>

      {/* Search */}

      <div className="mb-8">

        <input
          type="text"
          placeholder="Поиск по логам..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="
            w-full
            bg-[#111827]
            border
            border-white/10
            rounded-2xl
            px-5
            py-4
            text-white
            focus:outline-none
            focus:border-orange-500
          "
        />

      </div>

      {/* Stats */}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mb-10">

        <div className="bg-[#111827] border border-white/5 rounded-3xl p-6">
          <p className="text-slate-400 text-sm">
            Всего действий
          </p>

          <h2 className="text-4xl font-black mt-2">
            142
          </h2>
        </div>

        <div className="bg-[#111827] border border-white/5 rounded-3xl p-6">
          <p className="text-slate-400 text-sm">
            Назначений
          </p>

          <h2 className="text-4xl font-black mt-2 text-emerald-400">
            24
          </h2>
        </div>

        <div className="bg-[#111827] border border-white/5 rounded-3xl p-6">
          <p className="text-slate-400 text-sm">
            Выговоров
          </p>

          <h2 className="text-4xl font-black mt-2 text-red-400">
            81
          </h2>
        </div>

        <div className="bg-[#111827] border border-white/5 rounded-3xl p-6">
          <p className="text-slate-400 text-sm">
            Blacklist
          </p>

          <h2 className="text-4xl font-black mt-2 text-orange-400">
            37
          </h2>
        </div>

      </div>

      {/* Logs */}

      <div className="space-y-4">

        {filteredLogs.map((log, index) => (

          <div
            key={index}
            className={`
              border
              rounded-3xl
              p-6
              ${getTypeColor(log.type)}
            `}
          >

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-5">

                <div className="text-3xl">
                  {getTypeIcon(log.type)}
                </div>

                <div>

                  <h3 className="text-xl font-black">
                    {log.action}
                  </h3>

                  <p className="text-slate-300 mt-1">
                    {log.admin}
                  </p>

                </div>

              </div>

              <div className="text-right">

                <h4 className="font-bold text-lg">
                  {log.target}
                </h4>

                <p className="text-slate-400 text-sm">
                  {log.date}
                </p>

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}