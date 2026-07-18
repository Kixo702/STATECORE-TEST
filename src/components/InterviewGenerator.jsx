import { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────
// Встроенная база данных генератора. Расширяется без изменения логики —
// просто дописывай объекты в нужные массивы.
// ─────────────────────────────────────────────────────────────

const FACTIONS = [
  { id: 'gov',    label: 'Гос. структуры', accent: '56,189,248' },
  { id: 'mafia',  label: 'Мафии',          accent: '239,68,68'  },
  { id: 'ghetto', label: 'Гетто',          accent: '168,85,247' },
  { id: 'bikers', label: 'Байкеры',        accent: '251,146,60' },
]

const ORGANIZATIONS = {
  gov: [
    { id: 'gov',   label: 'GOV',   group: 'Правительство' },
    { id: 'lspd',  label: 'LSPD',  group: 'Полицейские департаменты' },
    { id: 'sfpd',  label: 'SFPD',  group: 'Полицейские департаменты' },
    { id: 'lvmpd', label: 'LVMPD', group: 'Полицейские департаменты' },
    { id: 'fbi',   label: 'FBI',   group: 'Полицейские департаменты' },
    { id: 'mcls',  label: 'MCLS',  group: 'Медицинские центры' },
    { id: 'mcsf',  label: 'MCSF',  group: 'Медицинские центры' },
    { id: 'mclv',  label: 'MCLV',  group: 'Медицинские центры' },
    { id: 'usmc',  label: 'USMC',  group: 'Армия' },
  ],
  mafia: [
    { id: 'russian', label: 'Russian Mafia' },
    { id: 'lcn',     label: 'La Cosa Nostra (LCN)' },
    { id: 'yakuza',  label: 'Yakuza' },
  ],
  ghetto: [
    { id: 'grove',  label: 'Grove Street' },
    { id: 'rifa',   label: 'Rifa' },
    { id: 'ballas', label: 'Ballas' },
    { id: 'vagos',  label: 'Vagos' },
    { id: 'aztec',  label: 'Aztecas' },
  ],
  bikers: [
    { id: 'bandidos',    label: 'Bandidos MC' },
    { id: 'hells_angels', label: 'Hells Angels MC' },
    { id: 'warlocks',    label: 'Warlocks MC' },
  ],
}

const DIFFICULTIES = [
  { id: 'easy', label: 'Легкое', hint: 'Для печенек / новичков' },
  { id: 'hard', label: 'Сложное', hint: 'Для старшего состава' },
]

// Вопросы на знание фракции/организации. general — общие для всей фракции,
// orgs[orgId] — уточняющие по конкретной организации.
const KNOWLEDGE_POOL = {
  gov: {
    general: [
      { q: 'Что такое конституция штата?', a: 'Главный свод законов штата — определяет устройство власти и права/обязанности всех структур и граждан.' },
      { q: 'Кто является высшим должностным лицом в штате?', a: 'Губернатор.' },
      { q: 'Как называется орган, принимающий законы штата?', a: 'Законодательное собрание (сенат) штата.' },
      { q: 'Кому подчиняется рядовой сотрудник госструктуры по уставу?', a: 'Своему прямому начальнику, далее по цепочке вплоть до главы ведомства.' },
      { q: 'Что грозит сотруднику за превышение полномочий?', a: 'Дисциплинарное взыскание вплоть до увольнения, в тяжёлых случаях — уголовное дело.' },
    ],
    orgs: {
      gov: [
        { q: 'Кто отвечает за назначение глав ведомств?', a: 'Губернатор либо его заместитель по представлению.' },
        { q: 'Что входит в обязанности правительства штата?', a: 'Управление бюджетом, координация ведомств, издание распоряжений.' },
      ],
      lspd: [
        { q: 'Кто возглавляет LSPD?', a: 'Шеф полиции Лос-Сантоса (Chief of Police).' },
        { q: 'В зоне ответственности какого города работает LSPD?', a: 'Лос-Сантос и прилегающая округа.' },
      ],
      sfpd: [
        { q: 'Кто возглавляет SFPD?', a: 'Шеф полиции Сан-Фиерро.' },
        { q: 'В зоне ответственности какого города работает SFPD?', a: 'Сан-Фиерро и прилегающая округа.' },
      ],
      lvmpd: [
        { q: 'Кто возглавляет LVMPD?', a: 'Шериф Лас-Вентураса (в объединённых департаментах город/округ обычно возглавляет шериф, а не шеф полиции).' },
        { q: 'В зоне ответственности какого города работает LVMPD?', a: 'Лас-Вентурас и прилегающая округа.' },
      ],
      fbi: [
        { q: 'Кто возглавляет FBI?', a: 'Директор ФБР.' },
        { q: 'Чем FBI отличается от городских департаментов вроде LSPD или SFPD?', a: 'Работает на федеральном уровне и подключается к делам, выходящим за рамки одного города/штата, а не патрулирует улицы напрямую.' },
      ],
      mcls: [
        { q: 'Какова первоочередная задача MCLS на вызове?', a: 'Оценка угрозы жизни и оказание немедленной помощи пострадавшему в Лос-Сантосе.' },
        { q: 'Кто руководит MCLS?', a: 'Старший врач / директор медицинского центра Лос-Сантоса.' },
      ],
      mcsf: [
        { q: 'Какова первоочередная задача MCSF на вызове?', a: 'Оценка угрозы жизни и оказание немедленной помощи пострадавшему в Сан-Фиерро.' },
        { q: 'Кто руководит MCSF?', a: 'Старший врач / директор медицинского центра Сан-Фиерро.' },
      ],
      mclv: [
        { q: 'Какова первоочередная задача MCLV на вызове?', a: 'Оценка угрозы жизни и оказание немедленной помощи пострадавшему в Лас-Вентурасе.' },
        { q: 'Кто руководит MCLV?', a: 'Старший врач / директор медицинского центра Лас-Вентураса.' },
      ],
      usmc: [
        { q: 'Какова основная задача USMC на территории штата?', a: 'Охрана стратегических объектов и поддержка гос. структур в чрезвычайных ситуациях.' },
        { q: 'Кому подчиняется USMC?', a: 'Собственному командованию, действующему по согласованию с руководством штата.' },
      ],
    },
  },
  mafia: {
    general: [
      { q: 'Кто принимает окончательные решения в семье?', a: 'Глава семьи (дон/босс).' },
      { q: 'Что такое закон молчания?', a: 'Негласное правило не выдавать дела и участников семьи посторонним, включая полицию.' },
      { q: 'Как распределяется прибыль внутри семьи?', a: 'По иерархии — часть отдаётся наверх боссу, остальное распределяет бригадир.' },
      { q: 'Что грозит тому, кто нарушил закон молчания?', a: 'Решение принимает глава семьи, обычно это исключение или более серьёзные меры.' },
      { q: 'Можно ли действовать против другой семьи без согласования?', a: 'Нет, самовольные действия против других организаций согласуются с руководством.' },
    ],
    orgs: {
      russian: [
        { q: 'Как принято обращаться к авторитетному старшему в русской мафии?', a: 'По уважительному прозвищу или статусу, принятому в конкретной группировке — уточняется на месте у руководства.' },
        { q: 'На чём традиционно держится репутация в русской мафии?', a: 'На «понятиях» — негласном кодексе поведения, verность своим и умение решать вопросы силой авторитета, а не суеты.' },
        { q: 'Как решаются споры между русской мафией и другими семьями?', a: 'Через переговоры авторитетов, самовольная эскалация без согласования не приветствуется.' },
      ],
      lcn: [
        { q: 'Как называется глава семьи в LCN?', a: 'Дон (Boss).' },
        { q: 'Кто передаёт приказы дона рядовым бойцам, не общаясь с ним напрямую?', a: 'Капореджиме (capo) и его бригада — классическая буферная структура LCN.' },
        { q: 'Что такое омерта в контексте LCN?', a: 'Закон молчания — запрет сотрудничать с полицией и выдавать дела семьи посторонним.' },
      ],
      yakuza: [
        { q: 'Как называется лидер клана якудза?', a: 'Оябун (кумитё для крупных синдикатов).' },
        { q: 'Что символизирует традиция юбицумэ у якудза?', a: 'Ритуал отрубания фаланги пальца как извинение перед боссом за серьёзную провинность.' },
        { q: 'На чём строятся отношения внутри клана якудза?', a: 'На модели «оябун-кобун» — то есть «отец-сын», со строгой личной преданностью старшему.' },
      ],
    },
  },
  ghetto: {
    general: [
      { q: 'Кто отвечает за порядок на районе?', a: 'Лидер группировки и его приближённые.' },
      { q: 'Как решаются споры между районами?', a: 'Через переговоры лидеров, в крайнем случае — силовым путём.' },
      { q: 'Что грозит тому, кто подставляет своих?', a: 'Серьёзное наказание вплоть до изгнания с района — решает лидер.' },
      { q: 'Может ли новичок вести дела от своего имени?', a: 'Обычно нет — требуется одобрение старших до определённого уровня доверия.' },
    ],
    orgs: {
      grove: [
        { q: 'Какой цвет ассоциируется с Grove Street?', a: 'Зелёный.' },
        { q: 'На чём строится авторитет внутри Grove Street?', a: 'На личной репутации и вкладе в район — уважение зарабатывается делами, а не словами.' },
        { q: 'Как Grove Street относится к соседним враждебным районам?', a: 'С постоянной territориальной настороженностью — конфликт может вспыхнуть из-за любого нарушения границ.' },
      ],
      rifa: [
        { q: 'Какой цвет ассоциируется с Rifa?', a: 'Синий/голубой.' },
        { q: 'Что отличает Rifa от уличных банд без чёткой структуры?', a: 'Более выраженная внутренняя дисциплина и связь с латиноамериканской диаспорой района.' },
        { q: 'Как в Rifa относится к предательству своих?', a: 'Крайне жёстко — расценивается как позор для всей группировки, не только для человека.' },
      ],
      ballas: [
        { q: 'Какой цвет ассоциируется с Ballas?', a: 'Фиолетовый.' },
        { q: 'С кем у Ballas исторически многолетнее противостояние?', a: 'С Grove Street — классическая территориальная вражда районов.' },
        { q: 'Как принимаются решения внутри Ballas?', a: 'Через лидеров конкретных сетов (подразделений района), единого формального устава нет.' },
      ],
      vagos: [
        { q: 'Какой цвет ассоциируется с Vagos?', a: 'Жёлтый.' },
        { q: 'На чём в основном держится влияние Vagos на районе?', a: 'На контроле нелегального оборота и плотной сети своих людей на территории.' },
        { q: 'Как Vagos относится к вторжению чужаков на свою территорию?', a: 'Резко негативно, обычно с быстрой демонстрацией силы.' },
      ],
      aztec: [
        { q: 'Что для Aztecas значит понятие «семья» применительно к группировке?', a: 'Группировка воспринимается как продолжение семьи — с соответствующей взаимной ответственностью и защитой.' },
        { q: 'Как в Aztecas принято разбираться с внутренними конфликтами?', a: 'Через старших группировки, без вынесения споров на публику.' },
        { q: 'Как Aztecas относится к сотрудничеству с полицией?', a: 'Крайне негативно — расценивается как предательство своих.' },
      ],
    },
  },
  bikers: {
    general: [
      { q: 'Кто главный в мотоклубе?', a: 'Президент клуба.' },
      { q: 'Как называется собрание клуба, где решаются важные вопросы?', a: 'Сходка клуба (church).' },
      { q: 'Может ли рядовой участник представлять клуб на переговорах?', a: 'Как правило нет — это прерогатива президента или уполномоченных офицеров.' },
      { q: 'Что происходит с тем, кто публично оскорбляет клуб?', a: 'Разбирательство внутри клуба по уставу — решение принимает президент или совет.' },
    ],
    orgs: {
      bandidos: [
        { q: 'Какой девиз ассоциируется с Bandidos MC?', a: '«We are the people our parents warned us about» — уточняется у текущего руководства клуба на месте.' },
        { q: 'Как в Bandidos MC называется низшая ступень перед полноправным членством?', a: 'Пробат (prospect) — кандидат, проходящий проверку клубом.' },
      ],
      hells_angels: [
        { q: 'Какой символ ассоциируется с Hells Angels MC?', a: 'Крылатый череп («Death Head»).' },
        { q: 'Как устроена структура Hells Angels MC по регионам?', a: 'Клуб делится на отдельные чартеры (местные отделения), каждым руководит свой президент.' },
      ],
      warlocks: [
        { q: 'Что для Warlocks MC значит понятие «братство»?', a: 'Абсолютный приоритет интересов клуба и его участников над личными делами.' },
        { q: 'Как в Warlocks MC принято разбираться с внутренними конфликтами?', a: 'На сходке клуба, решение выносит президент или совет — без вынесения спора наружу.' },
      ],
    },
  },
}

// Псих-тест на честность и последовательность отыгровки.
// instruction описывает, как замечающему трактовать ответ — без служебных сокращений.
const PSYCH_POOL = {
  easy: [
    {
      q: 'Как вас зовут?',
      instruction: 'Кандидат называет имя и фамилию персонажа в первом лице, без запинки и без реального ника аккаунта. Растерянность или ответ реальным ником — повод уточнить готовность к отыгровке.',
    },
    {
      q: 'Сколько вам полных лет?',
      instruction: 'Кандидат называет возраст персонажа как свой собственный, в первом лице («мне ... лет»), без слов «моему персонажу» или отсылок к игре.',
    },
    {
      q: 'Откуда вы родом?',
      instruction: 'Кандидат называет город/штат по игровой легенде, отвечая от первого лица, как гражданин, а не описывая настройки анкеты персонажа.',
    },
    {
      q: 'Чем вы зарабатываете на жизнь?',
      instruction: 'Кандидат кратко и уверенно называет род занятий от первого лица, без противоречий с тем, что говорил раньше в разговоре.',
    },
    {
      q: 'Где вы сейчас находитесь и с какой целью сюда пришли?',
      instruction: 'Кандидат описывает текущее место и цель визита от первого лица, исходя из игровой ситуации, — без упоминания меню, интерфейса или технических терминов игры.',
    },
  ],
  hard: [
    {
      q: 'Что у меня на голове?',
      instruction: 'Ловушка на камеру интервьюера. Верно — кандидат отвечает исходя из внешнего вида персонажа в игре либо честно говорит, что не может судить по тому, что видит вне игры. Описание реальной внешности интервьюера — повод для отказа.',
    },
    {
      q: 'В закрытом чате организации обсуждали облаву. Через 10 минут по игре вы «случайно» избегаете патруля именно в этом районе. Это нормально?',
      instruction: 'Верный ответ — нет: решения персонажа должны опираться только на то, что он узнал внутри игры, а не на закрытую переписку игроков.',
    },
    {
      q: 'Кандидат говорит, что уже видел билет этого собеседования у знакомого, проходившего его вчера. Как это влияет на оценку?',
      instruction: 'Проверка честности интервьюера: правильная реакция — зафиксировать и подобрать другой билет, а не продолжать по раскрытому сценарию.',
    },
    {
      q: 'Вы случайно увидели на экране другого игрока информацию, которую ваш персонаж знать не должен. Как поступите?',
      instruction: 'Верно — кандидат не использует увиденное и сообщает об этом администрации при необходимости. Использование увиденного в отыгровке — повод для отказа.',
    },
  ],
}

// Ролевые ситуации по фракциям и сложности. criteria — на что смотреть заму при оценке,
// сформулировано простым языком без служебных сокращений.
const SITUATIONS = {
  gov: {
    easy: [
      { text: 'Гражданин отказывается показывать документы и убегает пешком. Ваши действия?', criteria: 'Соблюдение устава и протокола преследования, вызов подкрепления по рации, реалистичность действий (без мгновенного «телепорта» перед нарушителем).' },
      { text: 'На вызове вы понимаете, что не имеете полномочий на месте — территория другой организации. Что делаете?', criteria: 'Отыгровка субординации, связь с диспетчером или руководством, отказ от самовольных действий.' },
      { text: 'Во время патруля вы замечаете сослуживца, откровенно грубящего гражданину без повода. Ваши действия?', criteria: 'Реакция в рамках устава и субординации, попытка урегулировать ситуацию, отсутствие мгновенной публичной конфронтации без повода.' },
    ],
    hard: [
      { text: 'Вы видите, как ваш коллега берёт взятку от преступника. Ваши действия?', criteria: 'Отыгровка морального выбора персонажа, доклад по уставу вышестоящему, отсутствие мгновенного «идеального» решения без раздумий и колебаний.' },
      { text: 'На вас направили ствол, но у вас в руках папка с важными документами дела. Что будете делать?', criteria: 'Реалистичная отыгровка страха, попытка защитить документы правдоподобным способом, отсутствие неправдоподобных действий (никакой «магической» неуязвимости).' },
      { text: 'Вышестоящий приказывает сделать то, что противоречит уставу. Ваши действия?', criteria: 'Отыгровка внутреннего конфликта между долгом и субординацией, поиск легального способа возразить или доложить выше, без мгновенного героического отказа.' },
    ],
  },
  mafia: {
    easy: [
      { text: 'Новый рекрут постоянно опаздывает на сходки семьи. Как поступите?', criteria: 'Отыгровка иерархии, разговор или предупреждение в рамках роли, отсутствие угроз от лица игрока вне игры.' },
      { text: 'Конкурирующая группировка предлагает разово «договориться» за территорию. Ваши действия?', criteria: 'Правдоподобный торг, взвешивание рисков персонажа, без мгновенного согласия или отказа без отыгровки.' },
      { text: 'Клиент задерживает оплату за услугу семьи уже вторую неделю. Ваши действия?', criteria: 'Реалистичное давление в рамках статуса персонажа, эскалация через иерархию при необходимости, без мгновенного насилия.' },
    ],
    hard: [
      { text: 'На вас направили ствол, но у вас в руках папка с важными документами. Что будете делать?', criteria: 'Отыгровка страха, попытка защитить или спрятать документы правдоподобно, отсутствие неправдоподобных действий (не мгновенное обезоруживание одним движением).' },
      { text: 'Вы узнаёте, что доверенное лицо семьи — информатор полиции. Ваши действия?', criteria: 'Отыгровка внутреннего конфликта и субординации перед боссом, отсутствие самосуда без согласования внутри семьи.' },
      { text: 'Полиция предлагает вам сделку в обмен на информацию о семье. Ваши действия?', criteria: 'Отыгровка страха и расчёта персонажа, лояльность семье, отсутствие мгновенного согласия или превращения персонажа в идеального героя.' },
    ],
  },
  ghetto: {
    easy: [
      { text: 'Ваш район хотят «перекупить» разговором, без стрельбы. Ваши действия?', criteria: 'Реалистичный диалог, отстаивание территории аргументами в рамках роли, без агрессии по умолчанию.' },
      { text: 'Младший участник группировки нарушил договорённость с соседним районом. Что делаете?', criteria: 'Отыгровка ответственности лидера группы, разбирательство внутри банды, отсутствие немотивированного насилия.' },
      { text: 'На район пришли чужаки и ведут себя вызывающе, но без явной агрессии. Ваши действия?', criteria: 'Реалистичная демонстрация территориальности через диалог или давление, эскалация только при реальном поводе.' },
    ],
    hard: [
      { text: 'Полиция устраивает облаву у вашего дома, а в подвале спрятано оружие. Что будете делать?', criteria: 'Правдоподобная паника: персонаж не знает заранее о готовящейся облаве, попытка правдоподобно избавиться от улик.' },
      { text: 'Вы узнаёте, что друг детства работает информатором на конкурентов. Ваши действия?', criteria: 'Отыгровка эмоционального конфликта, отсутствие навязанного результата при «разборке», реалистичные последствия для отношений персонажей.' },
      { text: 'Ваш младший брат по игре ввязался в долг перед враждебной группировкой. Ваши действия?', criteria: 'Отыгровка семейной/дружеской лояльности, поиск решения через переговоры или ресурсы группировки, взвешенные риски без мгновенного силового решения.' },
    ],
  },
  bikers: {
    easy: [
      { text: 'Ваш байк сломался посреди трассы рядом с территорией конкурирующего клуба. Ваши действия?', criteria: 'Реалистичная оценка риска, попытка договориться или уйти без стрельбы, отсутствие неправдоподобного мгновенного ремонта.' },
      { text: 'На встрече клуба один из братьев публично оскорбляет президента клуба. Что делаете?', criteria: 'Отыгровка иерархии клуба, разбор конфликта через устав, без внезапного немотивированного насилия.' },
      { text: 'Новый пробат (кандидат в клуб) не выполнил поручение вовремя. Ваши действия?', criteria: 'Отыгровка иерархии клуба, разбор через устав, отсутствие мгновенного жёсткого наказания без повода.' },
    ],
    hard: [
      { text: 'Конкурирующий клуб предлагает перемирие, но вы подозреваете ловушку. Ваши действия?', criteria: 'Осторожная отыгровка недоверия, привлечение братьев для подстраховки в рамках роли, отсутствие знания реальных намерений оппонента, которое персонаж не мог получить в игре.' },
      { text: 'Вы находите в клубхаусе крупную сумму денег без объяснений от казначея. Ваши действия?', criteria: 'Отыгровка подозрительности и иерархии, разбирательство внутри клуба, отсутствие самосуда без доказательств.' },
      { text: 'Один из братьев тайно ведёт дела за спиной президента клуба. Ваши действия?', criteria: 'Отыгровка внутреннего конфликта и субординации, доклад президенту либо совету клуба, отсутствие самосуда.' },
    ],
  },
}

// ── Иконки: мотив личного дела / канцелярии ───────────
const IC = {
  stamp:   <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"><path d="M12 3a3 3 0 013 3c0 1.3-.7 2.4-1.8 2.9L14 12h3a2 2 0 012 2v2H5v-2a2 2 0 012-2h3l.8-3.1A3.3 3.3 0 019 6a3 3 0 013-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  refresh: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none"><path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M4.6 15a8 8 0 0014.5 2.9M19.4 9a8 8 0 00-14.5-2.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  clock:   <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  play:    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
  pause:   <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>,
  chevron: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  folder:  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"><path d="M3 6.5A1.5 1.5 0 014.5 5H9l2 2h8.5A1.5 1.5 0 0121 8.5v10A1.5 1.5 0 0119.5 20h-15A1.5 1.5 0 013 18.5v-12z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  gavel:   <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"><path d="M14 5l5 5M8 11l5 5M4 20l5.5-5.5M11.5 5.5l3-3 5 5-3 3-5-5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  target:  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>,
  minus:   <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none"><path d="M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
  plus:    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
  pin:     <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none"><path d="M12 2a6 6 0 00-6 6c0 4.5 6 12 6 12s6-7.5 6-12a6 6 0 00-6-6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="1.6"/></svg>,
}

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5)
const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

// ── Степпер количества вопросов ──
function CountStepper({ label, value, max, onChange, accent }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 transition-colors duration-200 hover:border-white/[0.14]">
      <span className="text-[11px] uppercase tracking-wide text-white/40 font-bold">{label}</span>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onChange(clamp(value - 1, 1, max))}
          className="w-6 h-6 rounded-md flex items-center justify-center text-white/50 bg-white/5 hover:text-white hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-25"
          disabled={value <= 1}
        >
          {IC.minus}
        </button>
        <span className="w-5 text-center font-mono text-sm font-black tabular-nums" style={{ color: accent }}>{String(value).padStart(2, '0')}</span>
        <button
          onClick={() => onChange(clamp(value + 1, 1, max))}
          className="w-6 h-6 rounded-md flex items-center justify-center text-white/50 bg-white/5 hover:text-white hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-25"
          disabled={value >= max}
        >
          {IC.plus}
        </button>
      </div>
    </div>
  )
}

export default function InterviewGenerator() {
  const [faction, setFaction] = useState('gov')
  const [org, setOrg] = useState(ORGANIZATIONS.gov[0].id)
  const [difficulty, setDifficulty] = useState('easy')
  const [knowledgeCount, setKnowledgeCount] = useState(3)
  const [psychCount, setPsychCount] = useState(1)
  const [situationCount, setSituationCount] = useState(1)
  const [scenario, setScenario] = useState(null)
  const [revealed, setRevealed] = useState({})
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  // При смене фракции — выбираем первую организацию этой фракции
  useEffect(() => {
    const list = ORGANIZATIONS[faction]
    if (!list.find((o) => o.id === org)) setOrg(list[0].id)
  }, [faction]) // eslint-disable-line react-hooks/exhaustive-deps

  const knowledgePool = () => {
    const fac = KNOWLEDGE_POOL[faction]
    const orgQs = fac.orgs[org] || []
    return [...fac.general, ...orgQs]
  }
  const maxKnowledge = knowledgePool().length
  const maxPsych = PSYCH_POOL[difficulty].length
  const maxSituation = SITUATIONS[faction][difficulty].length

  const buildKnowledge = () => shuffle(knowledgePool()).slice(0, clamp(knowledgeCount, 1, maxKnowledge))
  const buildPsych = () => shuffle(PSYCH_POOL[difficulty]).slice(0, clamp(psychCount, 1, maxPsych))
  const buildSituation = () => shuffle(SITUATIONS[faction][difficulty]).slice(0, clamp(situationCount, 1, maxSituation))

  const handleGenerate = () => {
    const caseNo = `${String(Math.floor(Math.random() * 900) + 100)}·${String(Math.floor(Math.random() * 90) + 10)}`
    setScenario({
      caseNo,
      knowledge: buildKnowledge(),
      psych: buildPsych(),
      situation: buildSituation(),
    })
    setRevealed({})
    setElapsed(0)
    setRunning(true)
  }

  const rerollKnowledge = () => setScenario((s) => ({ ...s, knowledge: buildKnowledge() }))
  const rerollPsych = () => setScenario((s) => ({ ...s, psych: buildPsych() }))
  const rerollSituation = () => setScenario((s) => ({ ...s, situation: buildSituation() }))

  const toggleReveal = (key) => setRevealed((r) => ({ ...r, [key]: !r[key] }))

  const activeFaction = FACTIONS.find((f) => f.id === faction)
  const orgList = ORGANIZATIONS[faction]
  const activeOrg = orgList.find((o) => o.id === org)
  const accent = `rgb(${activeFaction.accent})`
  const caseNo = scenario ? scenario.caseNo : '——·———'

  return (
    <div className="text-white min-h-screen font-sans" style={{ background: 'radial-gradient(circle at 12% 0%, #1a2440 0%, #0a0e18 50%)' }}>
      <style>{`
        @keyframes ig-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes ig-spin    { to{transform:rotate(360deg)} }
        @keyframes ig-fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ig-pulse   { 0%,100%{opacity:.35} 50%{opacity:1} }
      `}</style>

      {/* ── STATUS STRIP ───────────────────────────────── */}

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-10">

        {/* ── HEADER ─────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase mb-2" style={{ color: accent, opacity: .85 }}>Приёмная комиссия</div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2 leading-tight">Личное дело кандидата</h1>
            <p className="text-slate-400 max-w-lg">Билет вопросов и ситуаций для приёмной комиссии — фракция, сложность и объём настраиваются ниже</p>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: accent }}
          >
            {IC.folder}
          </div>
        </div>

        {/* ── SETTINGS PANEL ────────────────────────────── */}
        <div className="flex flex-col gap-6 mb-8 bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* FACTION */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35">01 · Фракция / сфера</span>
              <div className="grid grid-cols-2 gap-2">
                {FACTIONS.map((f) => {
                  const active = faction === f.id
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFaction(f.id)}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all duration-150"
                      style={active
                        ? { background: `rgb(${f.accent})`, color: '#fff', boxShadow: `0 4px 18px rgba(${f.accent},.3)` }
                        : { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)' }}
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* DIFFICULTY */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35">02 · Сложность</span>
              <div className="grid grid-cols-2 gap-2">
                {DIFFICULTIES.map((d) => {
                  const active = difficulty === d.id
                  return (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id)}
                      className="px-3.5 py-2.5 rounded-xl text-left transition-all duration-150"
                      style={active
                        ? { background: 'rgba(255,140,0,.14)', border: '1px solid rgba(255,140,0,.5)', color: '#ffb066' }
                        : { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)' }}
                    >
                      <div className="text-xs font-bold">{d.label}</div>
                      <div className="text-[10px] mt-0.5 opacity-60">{d.hint}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── ORGANIZATION ── */}
          <div>
            <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35 block mb-2.5">03 · Организация</span>
            {orgList.some((o) => o.group) ? (
              <div className="space-y-3.5">
                {[...new Set(orgList.map((o) => o.group))].map((g) => (
                  <div key={g}>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 text-white/35">
                      <span style={{ color: accent, width: 12, height: 12, display: 'flex' }}>{IC.pin}</span>{g}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {orgList.filter((o) => o.group === g).map((o) => {
                        const active = org === o.id
                        return (
                          <button
                            key={o.id}
                            onClick={() => setOrg(o.id)}
                            className="px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all duration-150"
                            style={active
                              ? { background: `rgba(${activeFaction.accent},.14)`, border: `1px solid ${accent}`, color: accent }
                              : { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.55)' }}
                          >
                            {o.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {orgList.map((o) => {
                  const active = org === o.id
                  return (
                    <button
                      key={o.id}
                      onClick={() => setOrg(o.id)}
                      className="px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all duration-150"
                      style={active
                        ? { background: `rgba(${activeFaction.accent},.14)`, border: `1px solid ${accent}`, color: accent }
                        : { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.55)' }}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── QUESTION COUNTS ── */}
          <div>
            <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35 block mb-2.5">04 · Количество вопросов на блок</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <CountStepper label="По фракции" value={knowledgeCount} max={maxKnowledge} onChange={setKnowledgeCount} accent={accent} />
              <CountStepper label="Псих-тест" value={psychCount} max={maxPsych} onChange={setPsychCount} accent={accent} />
              <CountStepper label="Ситуации" value={situationCount} max={maxSituation} onChange={setSituationCount} accent={accent} />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            className="w-full sm:w-auto self-start px-7 py-3 rounded-xl font-black text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all duration-200 hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg, #ff8c00 0%, #e05a00 100%)', color: '#fff', boxShadow: '0 6px 24px rgba(255,140,0,.3)' }}
          >
            {IC.stamp} Сформировать дело
          </button>
        </div>

        {!scenario ? (
          /* ── EMPTY STATE ── */
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015]">
            <div className="flex flex-col items-center justify-center text-center px-6 py-16">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-white/5 text-white/35">
                {IC.gavel}
              </div>
              <p className="text-sm text-slate-400 max-w-xs">Настрой фракцию, организацию, сложность и количество вопросов — билет соберётся автоматически.</p>
            </div>
          </div>
        ) : (
          <div style={{ animation: 'ig-fadeUp .35s ease both' }}>

            {/* ── TIMER ── */}
            <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-3.5 mb-6">
              <div className="flex items-center gap-2.5 text-sm text-slate-400">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: running ? '#4ade80' : 'rgba(255,255,255,.25)', boxShadow: running ? '0 0 8px rgba(74,222,128,.6)' : 'none' }}
                />
                Время собеседования
                <span className="font-mono font-black tabular-nums text-base ml-1 text-white">{fmtTime(elapsed)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRunning((r) => !r)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: 'rgba(255,255,255,.7)', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}
                  title={running ? 'Пауза' : 'Продолжить'}
                >
                  {running ? IC.pause : IC.play}
                </button>
                <button
                  onClick={() => { setElapsed(0); setRunning(false) }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: 'rgba(255,255,255,.5)', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}
                  title="Сброс"
                >
                  {IC.clock}
                </button>
              </div>
            </div>

            {/* ── BLOCK 1: FACTION KNOWLEDGE ── */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">
                Вопросы по фракции {activeOrg ? `· ${activeOrg.label}` : ''}
              </span>
              <div className="flex-1 h-px bg-white/5" />
              <button
                onClick={rerollKnowledge}
                className="flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-1.5 transition-colors"
                style={{ color: 'rgba(255,255,255,.55)', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}
              >
                {IC.refresh} Заменить
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {scenario.knowledge.map((k, i) => (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accent }} />
                  <button
                    onClick={() => toggleReveal(`k-${i}`)}
                    className="w-full flex items-center justify-between gap-3 pl-5 pr-4 py-3.5 text-left"
                  >
                    <span className="font-semibold text-sm text-slate-200">{k.q}</span>
                    <span
                      className={`shrink-0 transition-transform ${revealed[`k-${i}`] ? 'rotate-180' : ''}`}
                      style={{ color: 'rgba(255,255,255,.3)' }}
                    >
                      {IC.chevron}
                    </span>
                  </button>
                  {revealed[`k-${i}`] ? (
                    <div className="pl-5 pr-4 pb-4 pt-0.5" style={{ animation: 'ig-fadeUp .25s ease both' }}>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider mb-1" style={{ color: accent }}>Ориентир для зама</div>
                      <div className="text-xs leading-relaxed text-slate-400">{k.a}</div>
                    </div>
                  ) : (
                    <div className="pl-5 pr-4 pb-3.5 -mt-1 text-[11px] text-white/25">нажми, чтобы раскрыть ориентир ответа</div>
                  )}
                </div>
              ))}
            </div>

            {/* ── BLOCK 2: PSYCH TEST ── */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">Псих-тест</span>
              <div className="flex-1 h-px bg-white/5" />
              <button
                onClick={rerollPsych}
                className="flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-1.5 transition-colors"
                style={{ color: 'rgba(255,255,255,.55)', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}
              >
                {IC.refresh} Заменить
              </button>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] mb-10">
              <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'rgb(56,189,248)' }} />
              <div className="pl-6 pr-5 py-5 space-y-5">
                {scenario.psych.map((p, i) => (
                  <div key={i} className={i > 0 ? 'pt-5 border-t border-white/[0.06]' : ''}>
                    <p className="font-semibold text-[15px] mb-3 text-slate-200">{p.q}</p>
                    <div className="rounded-lg px-4 py-3 border" style={{ background: 'rgba(56,189,248,.06)', borderColor: 'rgba(56,189,248,.25)' }}>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider mb-1" style={{ color: 'rgb(56,189,248)' }}>Инструкция для зама</div>
                      <p className="text-xs leading-relaxed text-slate-400">{p.instruction}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── BLOCK 3: SITUATIONS ── */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">Нестандартная ситуация</span>
              <div className="flex-1 h-px bg-white/5" />
              <button
                onClick={rerollSituation}
                className="flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-1.5 transition-colors"
                style={{ color: 'rgba(255,255,255,.55)', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}
              >
                {IC.refresh} Заменить
              </button>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] mb-4">
              <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accent }} />
              <div className="pl-6 pr-5 py-5 space-y-5">
                {scenario.situation.map((sit, i) => (
                  <div key={i} className={i > 0 ? 'pt-5 border-t border-white/[0.06]' : ''}>
                    <p className="font-semibold text-[15px] mb-3 text-slate-200">{sit.text}</p>
                    <div className="rounded-lg px-4 py-3 border border-white/[0.08] bg-white/[0.02]">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider mb-1 text-white/40">Критерии верного ответа</div>
                      <p className="text-xs leading-relaxed text-slate-400">{sit.criteria}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}