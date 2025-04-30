import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('ViewsController (e2e)', () => {
  let app: INestApplication;
  const profilesPath = join(process.cwd(), 'data', 'profiles.json');
  
  // Helper to clean up test data
  const cleanupProfiles = async () => {
    try {
      await fs.unlink(profilesPath);
    } catch (error) {
      // File may not exist, that's fine
    }
  };

  beforeAll(async () => {
    // Cleanup before tests
    await cleanupProfiles();
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    // Cleanup after tests
    await cleanupProfiles();
    await app.close();
  });

  describe('Static HTML endpoints', () => {
    it('/ (GET)', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Content-Type', /html/);
    });

    it('/video-chat (GET)', () => {
      return request(app.getHttpServer())
        .get('/video-chat')
        .expect(200)
        .expect('Content-Type', /html/);
    });

    it('/reaction-sync (GET)', () => {
      return request(app.getHttpServer())
        .get('/reaction-sync')
        .expect(200)
        .expect('Content-Type', /html/);
    });
  });

  describe('API Endpoints', () => {
    it('/api/sync-profiles (GET) should initially return empty array', () => {
      return request(app.getHttpServer())
        .get('/api/sync-profiles')
        .expect(200)
        .expect([]);
    });

    it('/api/sync-profiles (POST) should create a new profile', async () => {
      const profile = {
        name: 'Test Profile',
        reactionStartTime: 10,
        externalStartTime: 5,
        offset: 0,
        description: 'Test Description',
      };

      const response = await request(app.getHttpServer())
        .post('/api/sync-profiles')
        .send(profile)
        .expect(201);

      expect(response.body).toMatchObject({
        ...profile,
        id: expect.any(String),
        createdAt: expect.any(String),
      });

      // Verify we can retrieve the profile now
      const getResponse = await request(app.getHttpServer())
        .get('/api/sync-profiles')
        .expect(200);

      expect(getResponse.body).toHaveLength(1);
      expect(getResponse.body[0]).toMatchObject(profile);
    });

    it('/api/sync-profiles (POST) should add multiple profiles', async () => {
      const profile2 = {
        name: 'Second Profile',
        reactionStartTime: 15,
        externalStartTime: 8,
        offset: 500,
        description: 'Another test profile',
      };

      await request(app.getHttpServer())
        .post('/api/sync-profiles')
        .send(profile2)
        .expect(201);

      // Verify we now have 2 profiles
      const getResponse = await request(app.getHttpServer())
        .get('/api/sync-profiles')
        .expect(200);

      expect(getResponse.body).toHaveLength(2);
      expect(getResponse.body[1]).toMatchObject(profile2);
    });
  });
}); 