import { Test, TestingModule } from '@nestjs/testing';
import { SignalingGateway } from './signaling.gateway';
import { RoomsService } from '../rooms/rooms.service';
import { Socket } from 'socket.io';
import { createMock } from '@golevelup/ts-jest';

// Mock the Socket.io Server and Socket objects
jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  })),
}));

describe('SignalingGateway', () => {
  let gateway: SignalingGateway;
  let roomsService: RoomsService;
  let mockServer: any;

  beforeEach(async () => {
    // Create mock for RoomsService
    const mockRoomsService = {
      joinRoom: jest.fn(),
      leaveRoom: jest.fn(),
      isInRoom: jest.fn(),
      getRoomParticipants: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalingGateway,
        {
          provide: RoomsService,
          useValue: mockRoomsService,
        },
      ],
    }).compile();

    gateway = module.get<SignalingGateway>(SignalingGateway);
    roomsService = module.get<RoomsService>(RoomsService);

    // Mock the WebSocketServer
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    gateway['server'] = mockServer as any;

    // Reset join debounce time for testing
    // This is a workaround for testing timer-based functionality
    Object.defineProperty(gateway, 'JOIN_DEBOUNCE_TIME', {
      value: 0,
      writable: true,
    });

    // Mock setTimeout to execute immediately
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
    expect(roomsService).toBeDefined();
  });

  describe('handleJoin', () => {
    it('should add client to room and notify participants', () => {
      // Create a mock Socket
      const mockClient = createMock<Socket>({
        id: 'client1',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      });

      // Call handleJoin
      gateway.handleJoin({ roomId: 'test-room' }, mockClient);

      // Fast-forward timers
      jest.runAllTimers();

      // Check if client joined room
      expect(mockClient.join).toHaveBeenCalledWith('test-room');

      // Check if roomsService.joinRoom was called
      expect(roomsService.joinRoom).toHaveBeenCalledWith(
        'test-room',
        'client1',
      );

      // Check if client was notified
      expect(mockClient.emit).toHaveBeenCalledWith(
        'joined',
        expect.objectContaining({
          roomId: 'test-room',
          clientId: 'client1',
          participants: [],
        }),
      );
    });

    it('should not add client to room if already in room', () => {
      // Create a mock Socket
      const mockClient = createMock<Socket>({
        id: 'client1',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      });

      // Manually add client to activeParticipants
      const participants = gateway['getOrCreateParticipantSet']('test-room');
      participants.add('client1');

      // Call handleJoin
      gateway.handleJoin({ roomId: 'test-room' }, mockClient);

      // Fast-forward timers
      jest.runAllTimers();

      // Check that client.join was not called
      expect(mockClient.join).not.toHaveBeenCalled();
      expect(roomsService.joinRoom).not.toHaveBeenCalled();
    });

    it('should notify other participants when a new client joins', () => {
      // Add an existing client
      const participants = gateway['getOrCreateParticipantSet']('test-room');
      participants.add('existing-client');

      // Create a mock Socket for the new client
      const mockClient = createMock<Socket>({
        id: 'new-client',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      });

      // Call handleJoin
      gateway.handleJoin({ roomId: 'test-room' }, mockClient);

      // Fast-forward timers
      jest.runAllTimers();

      // Check if client joined room
      expect(mockClient.join).toHaveBeenCalledWith('test-room');

      // Check if client was notified about existing participants
      expect(mockClient.emit).toHaveBeenCalledWith(
        'joined',
        expect.objectContaining({
          roomId: 'test-room',
          clientId: 'new-client',
          participants: ['existing-client'],
        }),
      );

      // Check if existing participants were notified
      expect(mockClient.to).toHaveBeenCalledWith('test-room');
    });
  });

  describe('handleLeave', () => {
    it('should remove client from room and notify others', () => {
      // Create a mock Socket
      const mockClient = createMock<Socket>({
        id: 'client1',
        leave: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      });

      // Add client to activeParticipants
      const participants = gateway['getOrCreateParticipantSet']('test-room');
      participants.add('client1');

      // Call handleLeave
      gateway.handleLeave({ roomId: 'test-room' }, mockClient);

      // Check if client left room
      expect(mockClient.leave).toHaveBeenCalledWith('test-room');
      expect(roomsService.leaveRoom).toHaveBeenCalledWith(
        'test-room',
        'client1',
      );
      expect(participants.has('client1')).toBe(false);

      // Check if others were notified
      expect(mockClient.to).toHaveBeenCalledWith('test-room');
    });
  });

  describe('handleChatMessage', () => {
    it('should broadcast chat message to all clients in the room', () => {
      // Create a mock Socket
      const mockClient = createMock<Socket>({
        id: 'client1',
      });

      // Mock the isInRoom to return true
      jest.spyOn(roomsService, 'isInRoom').mockReturnValue(true);

      const chatMessage = {
        roomId: 'test-room',
        message: 'Hello, world!',
      };

      // Call handleChatMessage
      gateway.handleChatMessage(chatMessage, mockClient);

      // Check if message was broadcast
      expect(mockServer.to).toHaveBeenCalledWith('test-room');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'chatMessage',
        expect.objectContaining({
          clientId: 'client1',
          message: 'Hello, world!',
          roomId: 'test-room',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should not send message if client is not in room', () => {
      // Create a mock Socket
      const mockClient = createMock<Socket>({
        id: 'client1',
      });

      // Mock the isInRoom to return false
      jest.spyOn(roomsService, 'isInRoom').mockReturnValue(false);

      const chatMessage = {
        roomId: 'test-room',
        message: 'Hello, world!',
      };

      // Call handleChatMessage
      gateway.handleChatMessage(chatMessage, mockClient);

      // Check that message was not broadcast
      expect(mockServer.to).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe('WebRTC signaling', () => {
    it('should forward offer to target client', () => {
      // Create a mock Socket
      const mockClient = createMock<Socket>({
        id: 'client1',
      });

      const offerData = {
        roomId: 'test-room',
        targetId: 'target-client',
        offer: { type: 'offer', sdp: 'test-sdp' } as RTCSessionDescriptionInit,
      };

      // Call handleOffer
      gateway.handleOffer(offerData, mockClient);

      // Check if offer was forwarded
      expect(mockServer.to).toHaveBeenCalledWith('target-client');
      expect(mockServer.emit).toHaveBeenCalledWith('offer', {
        roomId: 'test-room',
        sourceId: 'client1',
        offer: offerData.offer,
      });
    });

    it('should forward answer to target client', () => {
      // Create a mock Socket
      const mockClient = createMock<Socket>({
        id: 'client1',
      });

      const answerData = {
        roomId: 'test-room',
        targetId: 'target-client',
        answer: {
          type: 'answer',
          sdp: 'test-sdp',
        } as RTCSessionDescriptionInit,
      };

      // Call handleAnswer
      gateway.handleAnswer(answerData, mockClient);

      // Check if answer was forwarded
      expect(mockServer.to).toHaveBeenCalledWith('target-client');
      expect(mockServer.emit).toHaveBeenCalledWith('answer', {
        roomId: 'test-room',
        sourceId: 'client1',
        answer: answerData.answer,
      });
    });

    it('should forward ICE candidates to target client', () => {
      // Create a mock Socket
      const mockClient = createMock<Socket>({
        id: 'client1',
      });

      const candidateData = {
        roomId: 'test-room',
        targetId: 'target-client',
        candidate: { candidate: 'test-candidate' } as RTCIceCandidateInit,
      };

      // Call handleIceCandidate
      gateway.handleIceCandidate(candidateData, mockClient);

      // Check if ICE candidate was forwarded
      expect(mockServer.to).toHaveBeenCalledWith('target-client');
      expect(mockServer.emit).toHaveBeenCalledWith('ice-candidate', {
        roomId: 'test-room',
        sourceId: 'client1',
        candidate: candidateData.candidate,
      });
    });
  });

  describe('Stream state', () => {
    it('should notify room about stream state changes', () => {
      // Create a mock Socket
      const mockClient = createMock<Socket>({
        id: 'client1',
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      });

      const streamState = {
        roomId: 'test-room',
        video: true,
        audio: false,
        isScreenSharing: false,
      };

      // Call handleStreamState
      gateway.handleStreamState(streamState, mockClient);

      // Check if room was notified
      expect(mockClient.to).toHaveBeenCalledWith('test-room');
      expect(mockClient.emit).toHaveBeenCalledWith('stream-state-changed', {
        clientId: 'client1',
        video: true,
        audio: false,
        isScreenSharing: false,
      });
    });
  });
});
