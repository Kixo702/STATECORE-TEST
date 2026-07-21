import { useState, useMemo, useEffect } from 'react'

// Автоматический импорт всех .txt файлов из папки src/base/
const rawDocs = import.meta.glob('../base/**/*.txt', { as: 'raw', eager: true })

const SERVERS = [
  { id: 'texas', name: 'Texas' },
  { id: 'florida', name: 'Florida' },
  { id: 'nevada', name: 'Nevada' },
  { id: 'hawaii', name: 'Hawaii' },
  { id: 'indiana', name: 'Indiana' },
]

// Словарь для красивых названий файлов
const DOC_TITLES = {
  efk: 'Единый Федеральный Кодекс (ЕФК)',
  ugolovcodex: 'Уголовный Кодекс',
  ugolovcodex_2: 'Уголовный Кодекс',
  roadcodex: 'Дорожный Кодекс (ПДД)',
  'judges-system': 'Система Судебной Власти',
  judges_system: 'Система Судебной Власти',
  'fbi-regulations': 'Устав ФБР',
  charter: 'Общий Устав Государственных Структур',
  pdd: 'Правила Дорожного Движения (ПДД)',
  'ten-codes': 'Тен-коды и Маркировки',
}

const allDocs = Object.entries(rawDocs).map(([path, content]) => {
  const parts = path.split('/')
  const fileName = parts.pop() || ''
  const serverFolder = parts.pop() || 'texas'
  const docId = fileName.replace(/\.txt$/i, '').toLowerCase()

  const title =
    DOC_TITLES[docId] ||
    docId
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

  return {
    server: serverFolder.toLowerCase(),
    id: docId,
    title: title,
    content: String(content).trim(),
  }
})

// УНИВЕРСАЛЬНЫЙ ПАРСЕР ДЛЯ ВСЕХ ТИПОВ ДОКУМЕНТОВ И СЕРВЕРОВ
function parseUniversalDoc(text) {
  // Очистка от скрытых Unicode-символов (zero-width spaces)
  const cleanText = text.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\r/g, '')
  const lines = cleanText.split('\n')
  const blocks = []
  let tableRows = []

  const flushTable = () => {
    if (tableRows.length > 0) {
      blocks.push({ type: 'table', rows: tableRows })
      tableRows = []
    }
  }

  for (let rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // 1. Детект Таблиц (Markdown-формат, табуляция или |)
    if (line.includes('\t') || (line.includes('|') && !line.startsWith('•') && !line.startsWith('·'))) {
      const cells = line.split(/\t+|\|/).map((c) => c.trim()).filter(Boolean)
      if (cells.length > 1) {
        tableRows.push(cells)
        continue
      }
    } else {
      flushTable()
    }

    // 2. Заголовки Глав и Пунктов (Глава 1..., Пункт 2. Нелегальная деятельность)
    if (/^(Глава|Пункт|Раздел)\s+\d+/i.test(line)) {
      blocks.push({ type: 'chapter', text: line })
      continue
    }

    // 3. Главный заголовок документа (ВСЕ КАПСОМ)
    if (line === line.toUpperCase() && line.length > 10 && !line.includes('§') && !line.startsWith('•')) {
      blocks.push({ type: 'doc_title', text: line })
      continue
    }

    // 4. Статьи вида "Статья 1.1.", "Статья 1.4*.", "§1.1"
    const articleMatch = line.match(/^(Статья\s+\d+\.\d+\*?\.?|§\d+\.\d+)\s*(.*)/i)
    if (articleMatch) {
      blocks.push({
        type: 'article_title',
        code: articleMatch[1],
        title: articleMatch[2],
      })
      continue
    }

    // 5. Пункты УК/ЕФК/ПДД с выделением Наказания / Уровня розыска
    const numPointMatch = line.match(/^(\d+\.\d+(\.\d+)?)\s+(.*)/)
    if (numPointMatch) {
      const fullText = numPointMatch[3]

      // Ищем где начинается Уровень розыска, розыск, Штраф или Наказание
      const penaltyRegex = /(?:(\.|\;|\s)—?\s*)((?:Уровень розыска|розыск|Штраф|Наказание:).*) $/i
      const penaltyMatch = fullText.match(penaltyRegex)

      if (penaltyMatch) {
        const penaltyIndex = fullText.indexOf(penaltyMatch[2])
        const bodyText = fullText.slice(0, penaltyIndex).replace(/[\.;\s]+$/, '')
        const penaltyText = penaltyMatch[2]

        blocks.push({
          type: 'rule_point',
          num: numPointMatch[1],
          text: bodyText,
          penalty: penaltyText,
        })
      } else {
        blocks.push({
          type: 'rule_point',
          num: numPointMatch[1],
          text: fullText,
          penalty: null,
        })
      }
      continue
    }

    // 6. Буллеты / списки (• или · или - или —)
    if (/^[•·\-\—]\s*/.test(line)) {
      blocks.push({
        type: 'list_item',
        text: line.replace(/^[•·\-\—]\s*/, ''),
      })
      continue
    }

    // 7. Отдельные строки Наказаний ("Наказание: ...", "Уровень розыска ...")
    if (/^(Наказание:|Уровень розыска)/i.test(line) || line.includes('Уровень розыска')) {
      blocks.push({ type: 'penalty', text: line })
      continue
    }

    // 8. Примечания / Исключения
    if (/^(Примечание:|Исключение:)/i.test(line)) {
      blocks.push({ type: 'note', text: line })
      continue
    }

    // 9. Схемы со стрелочками (│, ▼)
    if (line.includes('│') || line.includes('▼')) {
      blocks.push({ type: 'scheme', text: line })
      continue
    }

    // 10. OOC Вставки (( ... ))
    if (line.startsWith('((')) {
      blocks.push({ type: 'ooc_note', text: line })
      continue
    }

    // 11. Обычный абзац текста
    blocks.push({ type: 'paragraph', text: line })
  }

  flushTable()
  return blocks
}

// Компонент подсвечивания найденных слов
function HighlightText({ text, query }) {
  if (!query || !text) return <span>{text}</span>
  const parts = String(text).split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-orange-500/30 text-orange-200 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  )
}

export default function KnowledgeBase() {
  const [selectedServer, setSelectedServer] = useState('texas')
  const [docSearch, setDocSearch] = useState('')
  const [inFileSearch, setInFileSearch] = useState('')
  const [activeDocId, setActiveDocId] = useState('')

  const serverDocs = useMemo(() => {
    return allDocs.filter((doc) => doc.server === selectedServer)
  }, [selectedServer])

  const filteredDocs = useMemo(() => {
    const q = docSearch.trim().toLowerCase()
    if (!q) return serverDocs
    return serverDocs.filter((d) => `${d.title}\n${d.content}`.toLowerCase().includes(q))
  }, [serverDocs, docSearch])

  useEffect(() => {
    if (serverDocs.length > 0) {
      setActiveDocId(serverDocs[0].id)
    } else {
      setActiveDocId('')
    }
  }, [selectedServer, serverDocs])

  const activeDoc = serverDocs.find((d) => d.id === activeDocId) || serverDocs[0] || null

  const parsedBlocks = useMemo(() => {
    if (!activeDoc) return []
    return parseUniversalDoc(activeDoc.content)
  }, [activeDoc])

  // Фильтр Умного поиска внутри файла
  const displayBlocks = useMemo(() => {
    const q = inFileSearch.trim().toLowerCase()
    if (!q) return parsedBlocks

    return parsedBlocks.filter((block) => {
      if (block.type === 'doc_title' || block.type === 'chapter') return true
      if (block.type === 'table') {
        return block.rows.some((row) => row.some((cell) => cell.toLowerCase().includes(q)))
      }
      const textToSearch = `${block.code || ''} ${block.num || ''} ${block.title || ''} ${block.text || ''} ${block.penalty || ''}`
      return textToSearch.toLowerCase().includes(q)
    })
  }, [parsedBlocks, inFileSearch])

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto text-slate-200">
      {/* Шапка */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] text-orange-400 tracking-[2.5px] uppercase font-bold mb-1.5">
            База Данных & Законодательство
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">База знаний</h1>
        </div>

        {/* Выпадающий список серверов */}
        <div className="flex items-center gap-3 bg-white/[0.04] p-2.5 rounded-2xl border border-white/10">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-2">Сервер:</span>
          <select
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value)}
            className="bg-[#0b1320] text-orange-400 font-bold text-sm px-4 py-2 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer"
          >
            {SERVERS.map((srv) => (
              <option key={srv.id} value={srv.id}>
                {srv.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        {/* Список файлов */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[1px] text-slate-400 mb-2">Поиск документа</div>
            <input
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              placeholder="Поиск файла..."
              className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-orange-500/40"
            />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
            <div className="text-xs uppercase tracking-[1px] text-slate-400 mb-2 px-1">
              Документы [{selectedServer}]
            </div>
            {filteredDocs.map((doc) => {
              const selected = doc.id === activeDoc?.id
              return (
                <button
                  key={doc.id}
                  onClick={() => setActiveDocId(doc.id)}
                  className={`w-full text-left rounded-2xl px-4 py-3 transition ${
                    selected
                      ? 'bg-orange-500/20 text-white ring-1 ring-orange-500/40'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <div className="text-sm font-bold">{doc.title}</div>
                  <div className="text-[11px] text-slate-500 mt-1 uppercase">
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Область просмотра документа */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-sm flex flex-col gap-6">
          {activeDoc ? (
            <>
              {/* Поиск внутри активного документа */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                  <h2 className="text-2xl font-black text-white">{activeDoc.title}</h2>
                  <span className="text-xs text-slate-500">
                  </span>
                </div>

                <div className="relative w-full md:w-80">
                  <input
                    value={inFileSearch}
                    onChange={(e) => setInFileSearch(e.target.value)}
                    placeholder="Поиск внутри этого документа..."
                    className="w-full rounded-2xl border border-orange-500/30 bg-[#08101d] px-4 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                  {inFileSearch && (
                    <button
                      onClick={() => setInFileSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Отображение распарсенного контента */}
              <div className="space-y-3">
                {displayBlocks.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    По запросу «{inFileSearch}» ничего не найдено.
                  </div>
                ) : (
                  displayBlocks.map((block, idx) => {
                    // Заголовок документа
                    if (block.type === 'doc_title') {
                      return (
                        <div key={idx} className="text-center py-4 border-b border-orange-500/20 my-2">
                          <h3 className="text-xl font-black text-orange-400 uppercase tracking-widest">
                            {block.text}
                          </h3>
                        </div>
                      )
                    }

                    // Глава / Раздел / Пункт
                    if (block.type === 'chapter') {
                      return (
                        <div key={idx} className="pt-6 pb-2">
                          <h4 className="text-base font-bold text-white uppercase tracking-wider bg-white/5 px-4 py-2.5 rounded-2xl border-l-4 border-orange-500 shadow-sm">
                            {block.text}
                          </h4>
                        </div>
                      )
                    }

                    // Статьи (Статья 1.4*., §1.1)
                    if (block.type === 'article_title') {
                      return (
                        <div key={idx} className="flex flex-wrap items-center gap-2.5 pt-4 text-white font-bold text-base">
                          <span className="bg-orange-500/20 text-orange-400 font-mono text-xs px-3 py-1 rounded-xl border border-orange-500/30">
                            <HighlightText text={block.code} query={inFileSearch} />
                          </span>
                          <span className="text-slate-100">
                            <HighlightText text={block.title} query={inFileSearch} />
                          </span>
                        </div>
                      )
                    }

                    // Пункты ЕФК / УК / Дорожного кодекса
                    if (block.type === 'rule_point') {
                      return (
                        <div
                          key={idx}
                          className="bg-[#0a121e] p-4 rounded-2xl border border-white/5 my-2 hover:border-white/10 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                        >
                          {/* Номер и описание */}
                          <div className="flex items-start gap-3">
                            <span className="bg-orange-500/10 text-orange-400 font-mono font-bold text-xs px-2.5 py-1 rounded-lg border border-orange-500/20 shrink-0 mt-0.5">
                              <HighlightText text={block.num} query={inFileSearch} />
                            </span>
                            <span className="text-slate-200 leading-relaxed text-sm">
                              <HighlightText text={block.text} query={inFileSearch} />
                            </span>
                          </div>

                          {/* Выделенный Уровень Розыска / Наказание */}
                          {block.penalty && (
                            <div className="shrink-0 flex items-center">
                              <span className="inline-flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-300 border border-red-500/30 px-3.5 py-1.5 rounded-xl shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                <HighlightText text={block.penalty} query={inFileSearch} />
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    }

                    // Буллеты и списки
                    if (block.type === 'list_item') {
                      return (
                        <div key={idx} className="flex items-start gap-3 text-sm text-slate-300 pl-4 py-0.5">
                          <span className="text-orange-400 font-bold text-base leading-none">•</span>
                          <span className="leading-relaxed">
                            <HighlightText text={block.text} query={inFileSearch} />
                          </span>
                        </div>
                      )
                    }

                    // Таблицы
                    if (block.type === 'table') {
                      return (
                        <div key={idx} className="overflow-x-auto my-3 rounded-2xl border border-white/10">
                          <table className="w-full text-left text-sm text-slate-300">
                            <tbody className="divide-y divide-white/5">
                              {block.rows.map((row, rIdx) => (
                                <tr
                                  key={rIdx}
                                  className={
                                    rIdx === 0
                                      ? 'bg-white/10 font-bold text-white'
                                      : 'bg-[#08101d]/50 hover:bg-white/5'
                                  }
                                >
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="p-3">
                                      <HighlightText text={cell} query={inFileSearch} />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    }

                    // Блок наказаний
                    if (block.type === 'penalty') {
                      return (
                        <div
                          key={idx}
                          className="my-1.5 inline-flex items-center gap-2 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 px-3.5 py-1.5 rounded-xl"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                          <HighlightText text={block.text} query={inFileSearch} />
                        </div>
                      )
                    }

                    // Примечания и исключения
                    if (block.type === 'note') {
                      return (
                        <div
                          key={idx}
                          className="my-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl"
                        >
                          <HighlightText text={block.text} query={inFileSearch} />
                        </div>
                      )
                    }

                    // Схемы со стрелочками
                    if (block.type === 'scheme') {
                      return (
                        <div key={idx} className="font-mono text-xs text-orange-300 bg-[#060b13] p-2 px-4 rounded-xl whitespace-pre">
                          <HighlightText text={block.text} query={inFileSearch} />
                        </div>
                      )
                    }

                    // OOC Наказания / Заметки
                    if (block.type === 'ooc_note') {
                      return (
                        <div key={idx} className="text-xs text-slate-400 bg-white/[0.02] p-2.5 rounded-xl border-l-2 border-orange-500/50 italic my-1">
                          <HighlightText text={block.text} query={inFileSearch} />
                        </div>
                      )
                    }

                    // Обычный абзац
                    return (
                      <p key={idx} className="text-slate-300 text-sm leading-relaxed my-1 pl-1">
                        <HighlightText text={block.text} query={inFileSearch} />
                      </p>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-slate-500">Выберите документ для просмотра</div>
          )}
        </div>
      </div>
    </div>
  )
}