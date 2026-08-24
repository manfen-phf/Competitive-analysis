import type { SessionUser } from "@/lib/auth";

type PermissionUser = Pick<SessionUser, "role" | "city" | "bdName">;
type ScopedOrder = { city: string; bdName: string };

export function canReadOrder(user: PermissionUser, order: ScopedOrder) {
  if (user.role === "SUPER_ADMIN" || user.role === "CITY_ADMIN") return true;
  return user.role === "BD" && user.city === order.city && user.bdName === order.bdName;
}

export function canMutateOrder(user: PermissionUser, order: ScopedOrder) {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "CITY_ADMIN") return user.city === order.city;
  return user.role === "BD" && user.city === order.city && user.bdName === order.bdName;
}

export function canMutateCollection(user: PermissionUser, collection: ScopedOrder) {
  return canMutateOrder(user, collection);
}

export function canExportCity(user: PermissionUser, city: string) {
  return user.role === "SUPER_ADMIN" || (user.role === "CITY_ADMIN" && user.city === city);
}

/** Data Center is an administrator workspace.  BD accounts use the collection flow instead. */
export function canManageDataCenter(user: PermissionUser) {
  return user.role === "SUPER_ADMIN" || user.role === "CITY_ADMIN";
}

export function canExportOrders(user: PermissionUser, city: string) {
  return canManageDataCenter(user) && canExportCity(user, city);
}
