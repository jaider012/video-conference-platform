import { Test, TestingModule } from '@nestjs/testing';
import { ViewsController } from './views.controller';
import { ViewsService } from './views.service';
import { join } from 'path';
import { Response } from 'express';

// Mock the ViewsService
const mockViewsService = {
  getSyncProfiles: jest.fn(),
  saveSyncProfile: jest.fn(),
};

// Mock the Response object
const mockResponse = () => {
  const res = {} as Response;
  res.sendFile = jest.fn().mockReturnValue(res);
  return res;
};

describe('ViewsController', () => {
  let controller: ViewsController;
  let viewsService: ViewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ViewsController],
      providers: [
        {
          provide: ViewsService,
          useValue: mockViewsService,
        },
      ],
    }).compile();

    controller = module.get<ViewsController>(ViewsController);
    viewsService = module.get<ViewsService>(ViewsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Static HTML endpoints', () => {
    it('should serve video-chat.html at root path', () => {
      const res = mockResponse();
      controller.serveVideoChat(res);
      expect(res.sendFile).toHaveBeenCalledWith(
        join(process.cwd(), 'public', 'video-chat.html'),
      );
    });

    it('should serve video-chat.html at /video-chat path', () => {
      const res = mockResponse();
      controller.serveVideoChatPage(res);
      expect(res.sendFile).toHaveBeenCalledWith(
        join(process.cwd(), 'public', 'video-chat.html'),
      );
    });

    it('should serve reaction-sync.html at /reaction-sync path', () => {
      const res = mockResponse();
      controller.serveReactionSyncPage(res);
      expect(res.sendFile).toHaveBeenCalledWith(
        join(process.cwd(), 'public', 'reaction-sync.html'),
      );
    });
  });

  describe('API endpoints', () => {
    it('should get sync profiles', async () => {
      const mockProfiles = [
        {
          id: '123',
          name: 'Test Profile',
          reactionStartTime: 10,
          externalStartTime: 5,
          offset: 0,
          description: 'Test Description',
          createdAt: '2023-01-01',
        },
      ];
      mockViewsService.getSyncProfiles.mockResolvedValue(mockProfiles);

      const result = await controller.getSyncProfiles();
      expect(result).toEqual(mockProfiles);
      expect(viewsService.getSyncProfiles).toHaveBeenCalled();
    });

    it('should save a sync profile', async () => {
      const mockProfileInput = {
        name: 'New Profile',
        reactionStartTime: 15,
        externalStartTime: 10,
        offset: 500,
        description: 'New Profile Description',
      };

      const mockSavedProfile = {
        ...mockProfileInput,
        id: 'generated-id',
        createdAt: '2023-01-01T00:00:00Z',
      };

      mockViewsService.saveSyncProfile.mockResolvedValue(mockSavedProfile);

      const result = await controller.saveSyncProfile(mockProfileInput);

      expect(result).toEqual(mockSavedProfile);
      expect(viewsService.saveSyncProfile).toHaveBeenCalledWith(
        mockProfileInput,
      );
    });
  });
});
