import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface ReportProgress {
  interviewId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  reportId?: string;
  message?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/interview-report',
})
export class InterviewReportGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private socketUserMap: Map<string, { userId: string; interviewIds: Set<string> }> = new Map();

  handleConnection(client: Socket) {
    console.log(`[InterviewReportGateway] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[InterviewReportGateway] Client disconnected: ${client.id}`);
    this.socketUserMap.delete(client.id);
  }

  @SubscribeMessage('join-interview')
  async handleJoinInterview(
    @MessageBody() data: { interviewId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { interviewId, userId } = data;

    client.join(interviewId);

    if (!this.socketUserMap.has(client.id)) {
      this.socketUserMap.set(client.id, { userId, interviewIds: new Set() });
    }
    this.socketUserMap.get(client.id)!.interviewIds.add(interviewId);

    console.log(`[InterviewReportGateway] User ${userId} joined interview ${interviewId}`);

    client.emit('joined-interview', { interviewId, message: 'Successfully joined interview room' });
  }

  @SubscribeMessage('leave-interview')
  handleLeaveInterview(
    @MessageBody() data: { interviewId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { interviewId, userId } = data;

    client.leave(interviewId);
    this.socketUserMap.get(client.id)?.interviewIds.delete(interviewId);

    console.log(`[InterviewReportGateway] User ${userId} left interview ${interviewId}`);
  }

  emitProgress(interviewId: string, data: Omit<ReportProgress, 'interviewId'>) {
    const progressData: ReportProgress = {
      interviewId,
      ...data,
    };
    this.server.to(interviewId).emit('report-progress', progressData);
    console.log(`[InterviewReportGateway] Progress emitted for ${interviewId}: Status ${data.status}`);
  }

  emitCompletion(interviewId: string, reportId: string) {
    this.server.to(interviewId).emit('report-complete', {
      interviewId,
      reportId,
      status: 'completed',
      message: 'Report generated successfully',
    });
    console.log(`[InterviewReportGateway] Completion emitted for ${interviewId}: Report ${reportId}`);
  }

  emitError(interviewId: string, error: string) {
    this.server.to(interviewId).emit('report-error', {
      interviewId,
      status: 'failed',
      error,
      message: 'Report generation failed',
    });
    console.log(`[InterviewReportGateway] Error emitted for ${interviewId}: ${error}`);
  }
}
