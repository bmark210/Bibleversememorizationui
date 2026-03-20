import type { bible_memory_db_internal_domain_UserVerse } from "./bible_memory_db_internal_domain_UserVerse";

export type TrainingStepHTTPResponse = {
  userVerse: bible_memory_db_internal_domain_UserVerse;
  nextTrainingModeId: number;
  reviewWasSuccessful: boolean;
  graduatedToReview: boolean;
};
