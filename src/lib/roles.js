// Roles and permission helpers
const ROLE_FULL = 'Главный Разработчик'
const ROLE_CHIEF = 'Главный Следящий'
const ROLE_DEPUTY = 'Заместитель Главного Следящего'
const ROLE_WATCHER = 'Следящий'
const ROLE_PLAYER = 'Игрок'
const LEADER_PREFIX = 'Лидер'

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
  // Изменять роли других может только руководство
  return isFullAccess(user) || isChief(user)
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
  isFullAccess, isChief, isDeputy, isWatcher, isLeader, isPlayer,
  canViewAll, canIssueReprimand, canRemoveLeader, canEditRoles, canReviewNickRequests, canViewMenu,
}