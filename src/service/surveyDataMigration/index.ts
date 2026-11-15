/**
 * Tells whether the data migration of a survey is still pending (the survey is temporarily unavailable).
 * The survey data migrations are defined by the application (Arena), which registers its own implementation
 * (ServerServiceType.surveyDataMigration); the default one never reports a pending migration.
 */
export interface SurveyDataMigrationService {
  isPending(options: { surveyId: number }): Promise<boolean>
}

export const SurveyDataMigrationServiceServer: SurveyDataMigrationService = {
  isPending: async () => false,
}
