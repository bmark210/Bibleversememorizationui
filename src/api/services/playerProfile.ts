import type { bible_memory_db_internal_domain_PlayerProfile } from "../models/bible_memory_db_internal_domain_PlayerProfile";
import { UsersService } from "./UsersService";

export type PlayerProfile = bible_memory_db_internal_domain_PlayerProfile;

export async function fetchPlayerProfile(
  viewerTelegramId: string,
  targetTelegramId: string,
): Promise<PlayerProfile> {
  return UsersService.getPlayerProfile(viewerTelegramId, targetTelegramId);
}
