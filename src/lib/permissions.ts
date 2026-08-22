import type { SessionUser } from "@/lib/auth";

type PermissionUser = Pick<SessionUser, "role" | "city" | "bdName">;
type ScopedOrder = { city: string; bdName: string };

export function canReadOrder(user: PermissionUser, order: ScopedOrder) {
  if (user.role === "SUPER_ADMIN" || user.role === "CITY_ADMIN") return true;
  return user.role === "BD" && user.bdName === order.bdName;
}

export function canMutateOrder(user: PermissionUser, order: ScopedOrder) {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "CITY_ADMIN") return user.city === order.city;
  return user.role === "BD" && user.bdName === order.bdName;
}

export function canExportCity(user: PermissionUser, city: string) {
  return user.role === "SUPER_ADMIN" || (user.role === "CITY_ADMIN" && user.city === city);
}
