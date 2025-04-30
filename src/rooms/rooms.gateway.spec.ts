import { Test, TestingModule } from '@nestjs/testing';
import { RoomsGateway } from './rooms.gateway';
import { RoomsService } from './rooms.service';

describe('RoomsGateway', () => {
  let gateway: RoomsGateway;
  let roomsService: RoomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsGateway,
        {
          provide: RoomsService,
          useValue: {
            createRoom: jest.fn(),
            joinRoom: jest.fn(),
            leaveRoom: jest.fn(),
            getRoomParticipants: jest.fn(),
            isInRoom: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<RoomsGateway>(RoomsGateway);
    roomsService = module.get<RoomsService>(RoomsService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
    expect(roomsService).toBeDefined();
  });

  // Since the RoomsGateway implementation is minimal, we're mostly testing
  // that it's correctly instantiated and has the RoomsService injected.
  // Additional tests would depend on the actual implementation of socket handlers.
}); 