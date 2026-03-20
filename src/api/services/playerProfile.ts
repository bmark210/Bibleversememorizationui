import type { domain_PlayerProfile } from "@/api/models/domain_PlayerProfile";
import { UsersService } from "@/api/services/UsersService";

export type PlayerProfile = domain_PlayerProfile;

export async function fetchPlayerProfile(
  viewerTelegramId: string,
  targetTelegramId: string
): Promise<PlayerProfile> {
  return UsersService.getPlayerProfile(viewerTelegramId, targetTelegramId);
}
