// Roles and permission helpers
const ROLE_FULL = 'Главный Разработчик'
const ROLE_CHIEF = 'Главный Следящий'
const ROLE_DEPUTY = 'Заместитель Главного Следящего'
const ROLE_WATCHER = 'Следящий'
const ROLE_PLAYER = 'Игрок'
const LEADER_PREFIX = 'Лидер'

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

// Permissions matrix (derivable from role)
export function isFullAccess(user) {
  return _roleName(user) === ROLE_FULL
}

export function isChief(user) {
  return _roleName(user) === ROLE_CHIEF
}

export function isDeputy(user) {
  return _roleName(user) === ROLE_DEPUTY
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

// action checks
export function canViewAll(user) {
  return isFullAccess(user) || isChief(user) || isDeputy(user) || isLeader(user) || isWatcher(user)
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

  // Раздел виден всем, у кого есть право просматривать пользователей —
  // конкретные действия (смена роли, выговор, снятие лидера) уже
  // ограничены внутри самой страницы в зависимости от роли
  if (id === 'users') {
    return canViewAll(user)
  }

  // Игрок
  if (isPlayer(user)) {
    return ['logs', 'blacklist'].includes(id)
  }

  // Остальной стафф
  if (
    isLeader(user) ||
    isWatcher(user) ||
    isDeputy(user) ||
    isChief(user) ||
    isFullAccess(user)
  ) {
    return true
  }

  return false
}

export default {
  ROLE_FULL, ROLE_CHIEF, ROLE_DEPUTY, ROLE_WATCHER, ROLE_PLAYER, LEADER_PREFIX,
  FACTIONS,
  getAllFactions, leaderRoleName, getAllLeaderRoles, getFactionByRoleName,
  isFullAccess, isChief, isDeputy, isWatcher, isLeader, isLeaderOfFaction, isPlayer,
  canViewAll, canIssueReprimand, canRemoveLeader, canEditRoles, canReviewNickRequests, canViewMenu,
}