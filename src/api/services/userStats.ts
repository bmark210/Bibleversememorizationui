import { UsersService } from "./UsersService";

export async function fetchUserDashboardStats(telegramId: string) {
  return UsersService.getUserStats(telegramId);
}
