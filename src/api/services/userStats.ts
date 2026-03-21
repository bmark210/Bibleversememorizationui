import type { domain_UserDashboardStats } from "@/api/models/domain_UserDashboardStats";
import { UsersService } from "@/api/services/UsersService";

export async function fetchUserDashboardStats(
  telegramId: string
): Promise<domain_UserDashboardStats> {
  return UsersService.getUserStats(telegramId);
}
