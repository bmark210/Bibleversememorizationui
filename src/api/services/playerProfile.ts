import type { bible_memory_db_internal_domain_PlayerProfile } from "@/api/models/bible_memory_db_internal_domain_PlayerProfile";
import { UsersService } from "@/api/services/UsersService";

export type PlayerProfile = bible_memory_db_internal_domain_PlayerProfile;

export function fetchPlayerProfile(
  viewerTelegramId: string,
  targetTelegramId: string
): Promise<PlayerProfile> {
  return UsersService.getPlayerProfile(viewerTelegramId, targetTelegramId);
}
