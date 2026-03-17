import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { Resume } from './entities/resume.entity';
import { ResumeAnalysis } from './entities/resume-analysis.entity';

interface AnalysisProgress {
  resumeId: string;
  stage: number;
  stageName: string;
  message: string;
  isCompleted: boolean;
  overallScore?: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/resume-analysis',
})
export class ResumeAnalysisGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    @InjectRepository(Resume)
    private resumeRepository: Repository<Resume>,
    @InjectRepository(ResumeAnalysis)
    private analysisRepository: Repository<ResumeAnalysis>,
  ) {}

  private stageNames: Record<number, string> = {
    0: '准备分析',
    1: '文本提取',
    2: '结构解析',
    3: '评分分析',
    4: '报告生成',
    5: '分析完成',
  };

  // socketId -> { userId, resumeIds }
  private socketUserMap: Map<string, { userId: string; resumeIds: Set<string> }> = new Map();

  handleConnection(client: Socket) {
    console.log(`[ResumeAnalysisGateway] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[ResumeAnalysisGateway] Client disconnected: ${client.id}`);
    const entry = this.socketUserMap.get(client.id);
    if (entry) {
      // 仅向该 socket 加入过的 room 广播断开通知
      for (const resumeId of entry.resumeIds) {
        this.server.to(resumeId).emit('user-disconnected', { socketId: client.id });
      }
      this.socketUserMap.delete(client.id);
    }
  }

  @SubscribeMessage('join-resume')
  async handleJoinResume(
    @MessageBody() data: { resumeId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { resumeId, userId } = data;

    client.join(resumeId);

    if (!this.socketUserMap.has(client.id)) {
      this.socketUserMap.set(client.id, { userId, resumeIds: new Set() });
    }
    this.socketUserMap.get(client.id)!.resumeIds.add(resumeId);

    console.log(`[ResumeAnalysisGateway] User ${userId} joined resume ${resumeId}`);

    client.emit('joined-resume', { resumeId, message: 'Successfully joined resume room' });

    // 加入 room 后立即查询当前状态，如果已完成则推送最新状态给该客户端
    try {
      const resume = await this.resumeRepository.findOne({ where: { id: resumeId } });
      if (!resume) return;

      if (resume.isProcessed) {
        // 已分析完成：查询得分并推送 analysis-complete
        const analysis = await this.analysisRepository.findOne({ where: { resumeId } });
        const overallScore = analysis?.overallScore ?? 0;
        client.emit('analysis-complete', {
          resumeId,
          overallScore,
          message: 'Analysis completed successfully',
        });
        console.log(`[ResumeAnalysisGateway] Sent cached completion to late joiner ${client.id} for resume ${resumeId}: Score ${overallScore}`);
      } else if (resume.analysisStage > 0) {
        // 分析进行中：推送当前阶段
        client.emit('analysis-progress', {
          resumeId,
          stage: resume.analysisStage,
          stageName: this.getStageName(resume.analysisStage),
          message: `正在进行第 ${resume.analysisStage} 阶段分析`,
          isCompleted: false,
        });
        console.log(`[ResumeAnalysisGateway] Sent current stage ${resume.analysisStage} to late joiner ${client.id} for resume ${resumeId}`);
      }
    } catch (err) {
      console.error(`[ResumeAnalysisGateway] Failed to query resume status on join: ${err}`);
    }
  }

  @SubscribeMessage('leave-resume')
  handleLeaveResume(
    @MessageBody() data: { resumeId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { resumeId, userId } = data;

    client.leave(resumeId);

    this.socketUserMap.get(client.id)?.resumeIds.delete(resumeId);

    console.log(`[ResumeAnalysisGateway] User ${userId} left resume ${resumeId}`);
  }

  emitProgress(resumeId: string, data: Omit<AnalysisProgress, 'resumeId'>) {
    const progressData: AnalysisProgress = {
      resumeId,
      ...data,
    };
    this.server.to(resumeId).emit('analysis-progress', progressData);
    console.log(`[ResumeAnalysisGateway] Progress emitted for ${resumeId}: Stage ${data.stage}`);
  }

  emitCompletion(resumeId: string, overallScore: number) {
    this.server.to(resumeId).emit('analysis-complete', {
      resumeId,
      overallScore,
      message: 'Analysis completed successfully',
    });
    console.log(`[ResumeAnalysisGateway] Completion emitted for ${resumeId}: Score ${overallScore}`);
  }

  emitError(resumeId: string, error: string) {
    this.server.to(resumeId).emit('analysis-error', {
      resumeId,
      error,
      message: 'Analysis failed',
    });
    console.log(`[ResumeAnalysisGateway] Error emitted for ${resumeId}: ${error}`);
  }

  getStageName(stage: number): string {
    return this.stageNames[stage] || '未知阶段';
  }
}
