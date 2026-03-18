import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameLearningResourcesToSuggestions1710777600000 implements MigrationInterface {
  name = 'RenameLearningResourcesToSuggestions1710777600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('interview_reports');
    const oldColumn = table?.findColumnByName('learningResources');
    const newColumn = table?.findColumnByName('learningSuggestions');

    if (oldColumn && !newColumn) {
      await queryRunner.renameColumn('interview_reports', 'learningResources', 'learningSuggestions');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('interview_reports');
    const oldColumn = table?.findColumnByName('learningSuggestions');
    const newColumn = table?.findColumnByName('learningResources');

    if (oldColumn && !newColumn) {
      await queryRunner.renameColumn('interview_reports', 'learningSuggestions', 'learningResources');
    }
  }
}
