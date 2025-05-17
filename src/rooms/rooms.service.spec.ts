import { Test, TestingModule } from '@nestjs/testing';
import { RoomsService } from './rooms.service';

describe('RoomsService', () => {
  let service: RoomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomsService],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRoom', () => {
    it('should create a new room', () => {
      // Spy on the internal Map to verify it's being set correctly
      const mapSpy = jest.spyOn(Map.prototype, 'set');

      service.createRoom('test-room');

      expect(mapSpy).toHaveBeenCalledWith('test-room', expect.any(Set));

      // Verify the room exists
      expect(service.getRoomParticipants('test-room')).toEqual([]);

      mapSpy.mockRestore();
    });

    it('should not duplicate existing rooms', () => {
      // Create a room first
      service.createRoom('test-room');

      // Spy on Map.set after creation
      const mapSpy = jest.spyOn(Map.prototype, 'set');

      // Try to create the same room again
      service.createRoom('test-room');

      // Verify set wasn't called again
      expect(mapSpy).not.toHaveBeenCalled();

      mapSpy.mockRestore();
    });
  });

  describe('joinRoom', () => {
    it('should add client to existing room', () => {
      // Create a room first
      service.createRoom('test-room');

      // Spy on Set.add
      const setSpy = jest.spyOn(Set.prototype, 'add');

      service.joinRoom('test-room', 'client-1');

      expect(setSpy).toHaveBeenCalledWith('client-1');
      expect(service.getRoomParticipants('test-room')).toEqual(['client-1']);

      setSpy.mockRestore();
    });

    it('should create room if it does not exist and add client', () => {
      // Spy on createRoom method
      const createRoomSpy = jest.spyOn(service, 'createRoom');

      service.joinRoom('new-room', 'client-1');

      expect(createRoomSpy).toHaveBeenCalledWith('new-room');
      expect(service.getRoomParticipants('new-room')).toEqual(['client-1']);

      createRoomSpy.mockRestore();
    });

    it('should allow multiple clients to join the same room', () => {
      service.joinRoom('test-room', 'client-1');
      service.joinRoom('test-room', 'client-2');

      expect(service.getRoomParticipants('test-room')).toEqual([
        'client-1',
        'client-2',
      ]);
    });
  });

  describe('leaveRoom', () => {
    beforeEach(() => {
      // Setup a room with two clients
      service.joinRoom('test-room', 'client-1');
      service.joinRoom('test-room', 'client-2');
    });

    it('should remove client from room', () => {
      service.leaveRoom('test-room', 'client-1');

      expect(service.getRoomParticipants('test-room')).toEqual(['client-2']);
      expect(service.isInRoom('test-room', 'client-1')).toBe(false);
      expect(service.isInRoom('test-room', 'client-2')).toBe(true);
    });

    it('should delete room when last client leaves', () => {
      // Spy on Map.delete
      const mapDeleteSpy = jest.spyOn(Map.prototype, 'delete');

      service.leaveRoom('test-room', 'client-1');
      service.leaveRoom('test-room', 'client-2');

      expect(mapDeleteSpy).toHaveBeenCalledWith('test-room');
      expect(service.getRoomParticipants('test-room')).toEqual([]);

      mapDeleteSpy.mockRestore();
    });

    it('should handle leaving non-existent room gracefully', () => {
      // This should not throw an error
      service.leaveRoom('non-existent-room', 'client-1');
      expect(service.getRoomParticipants('non-existent-room')).toEqual([]);
    });
  });

  describe('getRoomParticipants', () => {
    it('should return all participants in a room', () => {
      service.joinRoom('test-room', 'client-1');
      service.joinRoom('test-room', 'client-2');
      service.joinRoom('test-room', 'client-3');

      expect(service.getRoomParticipants('test-room')).toEqual([
        'client-1',
        'client-2',
        'client-3',
      ]);
    });

    it('should return empty array for non-existent room', () => {
      expect(service.getRoomParticipants('non-existent-room')).toEqual([]);
    });
  });

  describe('isInRoom', () => {
    beforeEach(() => {
      service.joinRoom('test-room', 'client-1');
    });

    it('should return true when client is in room', () => {
      expect(service.isInRoom('test-room', 'client-1')).toBe(true);
    });

    it('should return false when client is not in room', () => {
      expect(service.isInRoom('test-room', 'other-client')).toBe(false);
    });

    it('should return false for non-existent room', () => {
      expect(service.isInRoom('non-existent-room', 'client-1')).toBe(false);
    });
  });
});
