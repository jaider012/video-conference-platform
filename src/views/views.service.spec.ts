import { Test, TestingModule } from '@nestjs/testing';
import { ViewsService } from './views.service';
import { promises as fs } from 'fs';
import { join } from 'path';

// Create a mock for the fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
}));

// Set up a test profile
const testProfile = {
  name: 'Test Profile',
  reactionStartTime: 10,
  externalStartTime: 5,
  offset: 0,
  description: 'Test Description',
};

describe('ViewsService', () => {
  let service: ViewsService;
  const mockGeneratedId = 'mock-id-12345';
  const mockDate = '2023-06-01T12:00:00.000Z';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ViewsService],
    }).compile();

    service = module.get<ViewsService>(ViewsService);
    
    // Mock the Date constructor
    jest.spyOn(global, 'Date').mockImplementation(() => ({
      toISOString: () => mockDate,
    } as any));

    // Mock the generateId method
    jest.spyOn(service as any, 'generateId').mockReturnValue(mockGeneratedId);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSyncProfiles', () => {
    it('should return empty array when no profiles exist', async () => {
      // Mock fs.readFile to throw an error (file not found)
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('File not found'));
      
      const result = await service.getSyncProfiles();
      
      expect(result).toEqual([]);
      expect(fs.readFile).toHaveBeenCalledWith(
        join(process.cwd(), 'data', 'profiles.json'),
        'utf-8'
      );
      expect(fs.mkdir).toHaveBeenCalledWith(join(process.cwd(), 'data'), { recursive: true });
    });

    it('should return profiles when they exist', async () => {
      const mockProfiles = [
        {
          id: 'profile1',
          name: 'Profile 1',
          reactionStartTime: 10,
          externalStartTime: 5,
          offset: 0,
          description: 'Description 1',
          createdAt: '2023-01-01',
        },
      ];
      
      // Mock fs.readFile to return mock profiles
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockProfiles));
      
      const result = await service.getSyncProfiles();
      
      expect(result).toEqual(mockProfiles);
      expect(fs.readFile).toHaveBeenCalledWith(
        join(process.cwd(), 'data', 'profiles.json'),
        'utf-8'
      );
    });
  });

  describe('saveSyncProfile', () => {
    it('should save a new profile when no existing profiles', async () => {
      // Mock fs.readFile to throw an error (file not found)
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('File not found'));
      
      const result = await service.saveSyncProfile(testProfile);
      
      const expectedSavedProfile = {
        ...testProfile,
        id: mockGeneratedId,
        createdAt: mockDate,
      };
      
      expect(result).toEqual(expectedSavedProfile);
      expect(fs.mkdir).toHaveBeenCalledWith(join(process.cwd(), 'data'), { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        join(process.cwd(), 'data', 'profiles.json'),
        JSON.stringify([expectedSavedProfile], null, 2)
      );
    });

    it('should add profile to existing profiles', async () => {
      const existingProfiles = [
        {
          id: 'existing-id',
          name: 'Existing Profile',
          reactionStartTime: 5,
          externalStartTime: 2,
          offset: 100,
          description: 'Existing description',
          createdAt: '2023-01-01',
        },
      ];
      
      // Mock fs.readFile to return existing profiles
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(existingProfiles));
      
      const result = await service.saveSyncProfile(testProfile);
      
      const expectedSavedProfile = {
        ...testProfile,
        id: mockGeneratedId,
        createdAt: mockDate,
      };
      
      expect(result).toEqual(expectedSavedProfile);
      expect(fs.writeFile).toHaveBeenCalledWith(
        join(process.cwd(), 'data', 'profiles.json'),
        JSON.stringify([...existingProfiles, expectedSavedProfile], null, 2)
      );
    });
  });
}); 