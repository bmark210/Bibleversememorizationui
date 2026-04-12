import type { domain_PlayerProfile } from "../models/domain_PlayerProfile";
import { UsersService } from "./UsersService";

export type PlayerProfile = domain_PlayerProfile;

export async function fetchPlayerProfile(
  viewerTelegramId: string,
  targetTelegramId: string,
): Promise<PlayerProfile> {
  return UsersService.getPlayerProfile(viewerTelegramId, targetTelegramId);
}
