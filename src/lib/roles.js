// Roles and permission helpers
const ROLE_FULL = 'Главный Разработчик'

// Старые (докатегорийные) роли ГС/ЗГС. Часть пользователей в базе всё ещё
// имеет именно эти roleName — трактуем их как "Гос." (полный доступ, см. ниже).
const ROLE_CHIEF = 'Главный Следящий'
const ROLE_DEPUTY = 'Заместитель Главного Следящего'

// Старые роли ГС/ЗГС без разбивки по серверам (переходный период до полного
// переноса всех пользователей на серверные роли). Трактуются как "любой сервер".
const ROLE_CHIEF_GOV = 'ГС Гос.'
const ROLE_CHIEF_MAFIA = 'ГС Мафий'
const ROLE_CHIEF_GHETTO = 'ГС Гетто'
const ROLE_CHIEF_BO = 'ГС БО'
const ROLE_CHIEF_BIKERS = 'ГС Байкеров'

const ROLE_DEPUTY_GOV = 'ЗГС Гос.'
const ROLE_DEPUTY_MAFIA = 'ЗГС Мафий'
const ROLE_DEPUTY_GHETTO = 'ЗГС Гетто'
const ROLE_DEPUTY_BO = 'ЗГС БО'
const ROLE_DEPUTY_BIKERS = 'ЗГС Байкеров'

const ROLE_WATCHER = 'Следящий'
const ROLE_PLAYER = 'Игрок'
// Гостевая роль для приглашённых ютуберов/блогеров — только просмотр
// ограниченного набора разделов, без доступа к редактированию и без
// доступа к чувствительным разделам (запреты, ЧС, анти-блат).
const ROLE_YOUTUBER = 'Ютубер'
const LEADER_PREFIX = 'Лидер'

// direction ('gov' | 'mafia' | 'ghetto' | 'bo' | 'bikers') -> "безсерверная" roleName (legacy)
export const CHIEF_ROLES_BY_DIRECTION = {
  gov: ROLE_CHIEF_GOV,
  mafia: ROLE_CHIEF_MAFIA,
  ghetto: ROLE_CHIEF_GHETTO,
  bo: ROLE_CHIEF_BO,
  bikers: ROLE_CHIEF_BIKERS,
}

export const DEPUTY_ROLES_BY_DIRECTION = {
  gov: ROLE_DEPUTY_GOV,
  mafia: ROLE_DEPUTY_MAFIA,
  ghetto: ROLE_DEPUTY_GHETTO,
  bo: ROLE_DEPUTY_BO,
  bikers: ROLE_DEPUTY_BIKERS,
}

// direction -> "именительный" суффикс (для сборки roleName)
const DIRECTION_LABEL = {
  gov: 'Гос.',
  mafia: 'Мафий',
  ghetto: 'Гетто',
  bo: 'БО',
  bikers: 'Байкеров',
}

// Сервера. genitive — форма для названия роли ("ГС Гос. <genitive>")
export const SERVERS = [
  { id: 'texas', label: 'Texas', genitive: 'Техаса' },
  { id: 'florida', label: 'Florida', genitive: 'Флориды' },
  { id: 'nevada', label: 'Nevada', genitive: 'Невады' },
  { id: 'hawaii', label: 'Hawaii', genitive: 'Гавайев' },
  { id: 'indiana', label: 'Indiana', genitive: 'Индианы' },
]

export function getServerById(serverId) {
  return SERVERS.find((s) => s.id === serverId) || null
}

function buildServerRoleName(prefix, direction, serverId) {
  const server = getServerById(serverId)
  if (!server) return null
  return `${prefix} ${DIRECTION_LABEL[direction]} ${server.genitive}`
}

// CHIEF_ROLES_BY_DIRECTION_SERVER.gov.texas -> "ГС Гос. Техаса"
export const CHIEF_ROLES_BY_DIRECTION_SERVER = {}
export const DEPUTY_ROLES_BY_DIRECTION_SERVER = {}

for (const direction of Object.keys(DIRECTION_LABEL)) {
  CHIEF_ROLES_BY_DIRECTION_SERVER[direction] = {}
  DEPUTY_ROLES_BY_DIRECTION_SERVER[direction] = {}
  for (const server of SERVERS) {
    CHIEF_ROLES_BY_DIRECTION_SERVER[direction][server.id] = buildServerRoleName('ГС', direction, server.id)
    DEPUTY_ROLES_BY_DIRECTION_SERVER[direction][server.id] = buildServerRoleName('ЗГС', direction, server.id)
  }
}

// Плоский список всех ГС/ЗГС ролей (с серверами) — удобно для выпадающих списков в UI
export const STAFF_LEADERSHIP_ROLES = Object.keys(DIRECTION_LABEL).flatMap((direction) => [
  ...SERVERS.map((server) => ({
    kind: 'chief',
    direction,
    server: server.id,
    roleName: CHIEF_ROLES_BY_DIRECTION_SERVER[direction][server.id],
  })),
  ...SERVERS.map((server) => ({
    kind: 'deputy',
    direction,
    server: server.id,
    roleName: DEPUTY_ROLES_BY_DIRECTION_SERVER[direction][server.id],
  })),
])

// Все фракции сервера, сгруппированные по типу.
// label используется как суффикс роли лидера: `${LEADER_PREFIX} ${label}`
export const FACTIONS = {
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
    { id: 'bandidos',     label: 'Bandidos MC' },
    { id: 'hells_angels', label: 'Hells Angels MC' },
    { id: 'warlocks',     label: 'Warlocks MC' },
  ],
  radio: [
    { id: 'radio24', label: 'Радио24' },
  ],
}

// Плоский список всех фракций (с добавленным полем category)
export function getAllFactions() {
  return Object.entries(FACTIONS).flatMap(([category, list]) =>
    list.map((f) => ({ ...f, category }))
  )
}

// Имя роли лидера конкретной фракции, например "Лидер LSPD"
export function leaderRoleName(faction) {
  const label = typeof faction === 'string' ? faction : faction?.label
  if (!label) return LEADER_PREFIX
  return `${LEADER_PREFIX} ${label}`
}

// Полный список ролей-лидеров по всем фракциям — удобно для выпадающих списков в UI
export function getAllLeaderRoles() {
  return getAllFactions().map((f) => ({
    ...f,
    roleName: leaderRoleName(f),
  }))
}

// Найти фракцию по имени роли пользователя (например "Лидер LSPD" -> объект LSPD)
export function getFactionByRoleName(roleName) {
  if (typeof roleName !== 'string') return null
  const rn = roleName.trim()
  if (!rn.startsWith(LEADER_PREFIX)) return null
  const label = rn.slice(LEADER_PREFIX.length).trim()
  return getAllFactions().find((f) => f.label === label) || null
}

// helper: безопасно получить и нормализовать roleName
function _roleName(user) {
  if (!user) return ROLE_PLAYER
  const rn = user.roleName
  if (typeof rn !== 'string') return ROLE_PLAYER
  return rn.trim()
}

// Разобрать roleName на { kind: 'chief'|'deputy', direction, server } либо null.
// Понимает и новые серверные роли, и старые безсерверные/докатегорийные.
function parseLeadershipRole(rn) {
  if (rn === ROLE_CHIEF) return { kind: 'chief', direction: 'gov', server: null }
  if (rn === ROLE_DEPUTY) return { kind: 'deputy', direction: 'gov', server: null }

  for (const [direction, roleName] of Object.entries(CHIEF_ROLES_BY_DIRECTION)) {
    if (roleName === rn) return { kind: 'chief', direction, server: null }
  }
  for (const [direction, roleName] of Object.entries(DEPUTY_ROLES_BY_DIRECTION)) {
    if (roleName === rn) return { kind: 'deputy', direction, server: null }
  }

  for (const [direction, byServer] of Object.entries(CHIEF_ROLES_BY_DIRECTION_SERVER)) {
    for (const [serverId, roleName] of Object.entries(byServer)) {
      if (roleName === rn) return { kind: 'chief', direction, server: serverId }
    }
  }
  for (const [direction, byServer] of Object.entries(DEPUTY_ROLES_BY_DIRECTION_SERVER)) {
    for (const [serverId, roleName] of Object.entries(byServer)) {
      if (roleName === rn) return { kind: 'deputy', direction, server: serverId }
    }
  }

  return null
}

// Permissions matrix (derivable from role)
export function isFullAccess(user) {
  return _roleName(user) === ROLE_FULL
}

// true для любого ГС — серверного, безсерверного (legacy) и докатегорийного
export function isChief(user) {
  const parsed = parseLeadershipRole(_roleName(user))
  return !!parsed && parsed.kind === 'chief'
}

// true для любого ЗГС — серверного, безсерверного (legacy) и докатегорийного
export function isDeputy(user) {
  const parsed = parseLeadershipRole(_roleName(user))
  return !!parsed && parsed.kind === 'deputy'
}

// Направление конкретного ГС/ЗГС ('gov' | 'mafia' | 'ghetto' | 'bo' | 'bikers'),
// либо null, если это не ГС/ЗГС.
export function getLeadershipDirection(user) {
  const parsed = parseLeadershipRole(_roleName(user))
  return parsed ? parsed.direction : null
}

// Сервер конкретного ГС/ЗГС ('texas' | 'florida' | ...), либо null —
// если роль безсерверная (legacy) или пользователь вообще не ГС/ЗГС.
export function getLeadershipServer(user) {
  const parsed = parseLeadershipRole(_roleName(user))
  return parsed ? parsed.server : null
}

// ГС Гос. / ЗГС Гос. (а также старые докатегорийные ГС/ЗГС) — расширенный доступ
export function isGovLeadership(user) {
  return (isChief(user) || isDeputy(user)) && getLeadershipDirection(user) === 'gov'
}

// ГС/ЗГС любого направления, кроме Гос. — урезанный доступ в сайдбаре
export function isRestrictedLeadership(user) {
  return (isChief(user) || isDeputy(user)) && getLeadershipDirection(user) !== 'gov'
}

export function isWatcher(user) {
  return _roleName(user) === ROLE_WATCHER
}

export function isLeader(user) {
  const rn = _roleName(user)
  return rn.startsWith(LEADER_PREFIX)
}

// Проверка, что пользователь — лидер конкретной фракции.
// faction — id ('lspd'), label ('LSPD') или сам объект фракции.
export function isLeaderOfFaction(user, faction) {
  const rn = _roleName(user)
  if (!rn.startsWith(LEADER_PREFIX)) return false

  let target = faction
  if (typeof faction === 'string') {
    target = getAllFactions().find((f) => f.id === faction || f.label === faction)
  }
  if (!target) return false

  return rn === leaderRoleName(target)
}

export function isPlayer(user) {
  return _roleName(user) === ROLE_PLAYER
}

// Гостевая роль для ютуберов/блогеров, которым дали доступ на обзор сайта.
export function isYoutuber(user) {
  return _roleName(user) === ROLE_YOUTUBER
}

// Может ли user1 (ГС/ЗГС) работать с данными, относящимися к серверу targetServerId.
// - Полный доступ / докатегорийные / безсерверные (legacy) роли — видят все сервера.
// - Серверная роль — только свой сервер.
// - Если targetServerId не передан (данные без привязки к серверу) — доступ разрешён.
export function canAccessServer(user, targetServerId) {
  if (isFullAccess(user)) return true
  if (!targetServerId) return true

  const userServer = getLeadershipServer(user)
  if (!(isChief(user) || isDeputy(user))) return true // ограничение по серверу касается только ГС/ЗГС
  if (!userServer) return true // legacy безсерверная роль — доступ ко всем серверам

  return userServer === targetServerId
}

// action checks
export function canViewAll(user) {
  return isFullAccess(user) || isChief(user) || isDeputy(user) || isLeader(user) || isWatcher(user) || isYoutuber(user)
}

export function canIssueReprimand(user) {
  // Следящие и выше могут выдавать выговор
  return isFullAccess(user) || isChief(user) || isDeputy(user) || isWatcher(user)
}

export function canRemoveLeader(user) {
  // Только Зам и Главный Следящий и полный доступ
  return isFullAccess(user) || isChief(user) || isDeputy(user)
}

export function canEditRoles(user) {
  // Изменять роли других может руководство и заместитель главного следящего
  return isFullAccess(user) || isChief(user) || isDeputy(user)
}

export function canReviewNickRequests(user) {
  // Рассматривать заявки на смену ника могут те же, кто выдаёт выговоры
  return canIssueReprimand(user)
}

// menu visibility helper
export function canViewMenu(user, menuId) {
  if (!menuId || typeof menuId !== 'string') return false

  if (!user) {
    user = { roleName: ROLE_PLAYER }
  }

  const id = menuId.toLowerCase()

  // Ютубер — гостевой доступ для обзора сайта: только мониторинг,
  // просмотр пользователей и активности/аналитики лидеров, база знаний
  // и FAQ. Никаких запретов/ЧС/анти-блата/логов и никакого редактирования
  // (само редактирование и так недоступно этой роли на уровне canEditRoles
  // и т.п., это ограничение — про видимость разделов в сайдбаре).
  if (isYoutuber(user)) {
    return ['dashboard', 'users', 'activity', 'leaderanalytics', 'knowledge', 'faq'].includes(id)
  }

  // ГС/ЗГС любого направления, кроме "Гос." — пока что видят только
  // мониторинг и анти-блат (faq и база знаний и так всегда видны в сайдбаре).
  // Исключения: ГС/ЗГС БО, ГС/ЗГС мафий, ГС/ЗГС Гетто и ГС/ЗГС Байкеров
  // дополнительно видят свой раздел ЧС (chsgos) — остальные направления
  // подключаются по мере готовности.
  if (isRestrictedLeadership(user)) {
    const direction = getLeadershipDirection(user)
    if (direction === 'bo' || direction === 'mafia' || direction === 'ghetto' || direction === 'bikers') {
      return id === 'dashboard' || id === 'cadreaudit' || id === 'chsgos'
    }
    return id === 'dashboard' || id === 'cadreaudit'
  }

  // ГС Гос. / ЗГС Гос. (и старые докатегорийные ГС/ЗГС) — видят всё, что
  // видно и сейчас, кроме анти-блата
  if (isGovLeadership(user)) {
    return id !== 'cadreaudit'
  }

  // Раздел виден всем, у кого есть право просматривать пользователей —
  // конкретные действия (смена роли, выговор, снятие лидера) уже
  // ограничены внутри самой страницы в зависимости от роли
  if (id === 'users') {
    return canViewAll(user)
  }

  // Игрок
  if (isPlayer(user)) {
    return ['logs', 'blacklist', 'chsgos'].includes(id)
  }

  // Остальной стафф (лидеры, следящие, полный доступ)
  if (
    isLeader(user) ||
    isWatcher(user) ||
    isFullAccess(user)
  ) {
    return true
  }

  return false
}

export default {
  ROLE_FULL, ROLE_CHIEF, ROLE_DEPUTY, ROLE_WATCHER, ROLE_PLAYER, ROLE_YOUTUBER, LEADER_PREFIX,
  CHIEF_ROLES_BY_DIRECTION, DEPUTY_ROLES_BY_DIRECTION,
  CHIEF_ROLES_BY_DIRECTION_SERVER, DEPUTY_ROLES_BY_DIRECTION_SERVER,
  SERVERS, getServerById,
  STAFF_LEADERSHIP_ROLES,
  FACTIONS,
  getAllFactions, leaderRoleName, getAllLeaderRoles, getFactionByRoleName,
  isFullAccess, isChief, isDeputy, isWatcher, isLeader, isLeaderOfFaction, isPlayer, isYoutuber,
  getLeadershipDirection, getLeadershipServer, isGovLeadership, isRestrictedLeadership,
  canAccessServer,
  canViewAll, canIssueReprimand, canRemoveLeader, canEditRoles, canReviewNickRequests, canViewMenu,
}