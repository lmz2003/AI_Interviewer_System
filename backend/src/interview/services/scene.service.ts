import { Injectable } from '@nestjs/common';
import {
  SCENE_CONFIG,
  JOB_TYPE_CONFIG,
  DIFFICULTY_CONFIG,
  INTERVIEW_STATUS,
} from '../constants/scene-config';
import {
  SceneDto,
  JobTypeDto,
  DifficultyLevelDto,
} from '../dto/interview-response.dto';

@Injectable()
export class SceneService {
  getSceneList(): SceneDto[] {
    return Object.values(SCENE_CONFIG).map((scene) => ({
      code: scene.code,
      name: scene.name,
      description: scene.description,
      icon: scene.icon,
      questionCount: scene.questionCount,
    }));
  }

  getJobTypeList(): JobTypeDto[] {
    return Object.values(JOB_TYPE_CONFIG).map((jobType) => ({
      code: jobType.code,
      name: jobType.name,
      keywords: jobType.keywords,
    }));
  }

  getDifficultyLevels(): DifficultyLevelDto[] {
    return Object.values(DIFFICULTY_CONFIG).map((level) => ({
      code: level.code,
      name: level.name,
      description: level.description,
    }));
  }

  getSceneConfig(sceneType: string) {
    return SCENE_CONFIG[sceneType as keyof typeof SCENE_CONFIG];
  }

  getJobTypeConfig(jobType: string) {
    return JOB_TYPE_CONFIG[jobType as keyof typeof JOB_TYPE_CONFIG];
  }

  getDifficultyConfig(difficulty: string) {
    return DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG];
  }

  getStatusConfig(status: string) {
    return INTERVIEW_STATUS[status as keyof typeof INTERVIEW_STATUS];
  }

  getSceneName(sceneType: string): string {
    const config = this.getSceneConfig(sceneType);
    return config?.name || sceneType;
  }

  getJobTypeName(jobType: string): string {
    const config = this.getJobTypeConfig(jobType);
    return config?.name || jobType || '';
  }

  getDifficultyName(difficulty: string): string {
    const config = this.getDifficultyConfig(difficulty);
    return config?.name || difficulty;
  }

  getStatusName(status: string): string {
    const config = this.getStatusConfig(status);
    return config?.name || status;
  }
}
