import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@shared/database/prisma.service';

@WebSocketGateway({
  namespace: '/alerts',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
})
export class AlertGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('AlertGateway');
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  afterInit() {
    this.logger.log('AlertGateway initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(client: Socket) {
    try {
      // Extract and validate JWT token
      const token = client.handshake.auth.token;
      if (!token) {
        this.logger.warn('Connection attempt without token');
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub;

      // Register user socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(client.id);

      // Store userId on socket for later reference
      client.data.userId = userId;

      this.logger.log(`User ${userId} connected via socket ${client.id}`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Successfully connected to alert service',
        timestamp: new Date(),
      });

      // Send any pending active alerts for user
      await this.sendPendingAlerts(client, userId);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.logger.log(`User ${userId} disconnected socket ${client.id}`);
    }
  }

  /**
   * Subscribe to alerts for specific grids
   */
  @SubscribeMessage('subscribe_grids')
  async handleSubscribeGrids(client: Socket, data: { gridIds: number[] }) {
    const userId = client.data.userId;
    this.logger.log(`User ${userId} subscribing to grids: ${data.gridIds}`);

    // Join socket to room for each grid
    for (const gridId of data.gridIds) {
      const roomName = `grid_${gridId}`;
      client.join(roomName);
      this.logger.debug(`Socket ${client.id} joined room ${roomName}`);
    }

    // Send confirmation
    client.emit('subscribed', {
      grids: data.gridIds,
      message: `Successfully subscribed to ${data.gridIds.length} grids`,
      timestamp: new Date(),
    });
  }

  /**
   * Unsubscribe from grids
   */
  @SubscribeMessage('unsubscribe_grids')
  handleUnsubscribeGrids(client: Socket, data: { gridIds: number[] }) {
    const userId = client.data.userId;
    this.logger.log(`User ${userId} unsubscribing from grids: ${data.gridIds}`);

    // Leave room for each grid
    for (const gridId of data.gridIds) {
      const roomName = `grid_${gridId}`;
      client.leave(roomName);
      this.logger.debug(`Socket ${client.id} left room ${roomName}`);
    }

    client.emit('unsubscribed', {
      grids: data.gridIds,
      message: `Unsubscribed from ${data.gridIds.length} grids`,
      timestamp: new Date(),
    });
  }

  /**
   * Request current alerts for subscribed grids
   */
  @SubscribeMessage('get_current_alerts')
  async handleGetCurrentAlerts(client: Socket) {
    const userId = client.data.userId;
    this.logger.log(`User ${userId} requesting current alerts`);

    try {
      const alerts = await this.prisma.alert.findMany({
        where: {
          status: { in: ['active', 'acknowledged'] },
        },
        include: {
          grid: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      client.emit('current_alerts', {
        alerts,
        count: alerts.length,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error fetching current alerts: ${error.message}`);
      client.emit('error', {
        message: 'Failed to fetch current alerts',
        error: error.message,
      });
    }
  }

  /**
   * Request heartbeat (connection alive check)
   */
  @SubscribeMessage('heartbeat')
  handleHeartbeat(client: Socket) {
    const userId = client.data.userId;
    this.logger.debug(`Heartbeat from user ${userId}`);
    client.emit('heartbeat_response', {
      timestamp: new Date(),
      status: 'ok',
    });
  }

  /**
   * Broadcast alert to all connected users
   */
  broadcastAlert(alert: any, affectedGrids: number[] = []) {
    this.logger.log(`Broadcasting alert #${alert.id} to affected grids`);

    if (affectedGrids.length > 0) {
      // Broadcast to specific grid rooms
      for (const gridId of affectedGrids) {
        const roomName = `grid_${gridId}`;
        this.server.to(roomName).emit('alert', {
          alert,
          gridId,
          timestamp: new Date(),
        });
      }
    } else {
      // Broadcast to all connected clients
      this.server.emit('alert', {
        alert,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Broadcast risk status change
   */
  broadcastRiskStatusChange(gridId: number, riskData: any) {
    this.logger.log(`Broadcasting risk status change for grid ${gridId}`);

    const roomName = `grid_${gridId}`;
    this.server.to(roomName).emit('risk_status_change', {
      gridId,
      ...riskData,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast grid statistics update
   */
  broadcastGridUpdate(gridId: number, stats: any) {
    this.logger.log(`Broadcasting grid update for ${gridId}`);

    const roomName = `grid_${gridId}`;
    this.server.to(roomName).emit('grid_update', {
      gridId,
      ...stats,
      timestamp: new Date(),
    });
  }

  /**
   * Send pending alerts to user
   */
  private async sendPendingAlerts(client: Socket, userId: string) {
    try {
      const pref = await this.prisma.userNotificationPreference.findUnique({
        where: { userId },
      });

      if (!pref) {
        return;
      }

      const where: any = {
        status: { in: ['active', 'acknowledged'] },
      };

      if (!pref.notifyAllGrids && pref.favoriteGrids && pref.favoriteGrids.length > 0) {
        where.gridId = { in: pref.favoriteGrids };
      }

      const alerts = await this.prisma.alert.findMany({
        where,
        include: {
          grid: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      if (alerts.length > 0) {
        client.emit('pending_alerts', {
          alerts,
          count: alerts.length,
          message: `You have ${alerts.length} active alerts`,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(`Error sending pending alerts: ${error.message}`);
    }
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get user connection count
   */
  getUserConnectionCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }
}
