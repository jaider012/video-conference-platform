import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

interface SyncProfile {
  id: string;
  name: string;
  reactionStartTime: number;
  externalStartTime: number;
  offset: number;
  description: string;
  createdAt: string;
}

@Injectable()
export class ViewsService {
  private readonly profilesPath = join(process.cwd(), 'data', 'profiles.json');

  async getSyncProfiles(): Promise<SyncProfile[]> {
    try {
      await this.ensureDataDir();
      const data = await fs.readFile(this.profilesPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or is invalid, return empty array
      return [];
    }
  }

  async saveSyncProfile(
    profile: Omit<SyncProfile, 'id' | 'createdAt'>,
  ): Promise<SyncProfile> {
    await this.ensureDataDir();

    let profiles: SyncProfile[] = [];
    try {
      const data = await fs.readFile(this.profilesPath, 'utf-8');
      profiles = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty array
    }

    const newProfile: SyncProfile = {
      ...profile,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
    };

    profiles.push(newProfile);
    await fs.writeFile(this.profilesPath, JSON.stringify(profiles, null, 2));

    return newProfile;
  }

  private async ensureDataDir(): Promise<void> {
    const dataDir = join(process.cwd(), 'data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      // Directory already exists or can't be created
    }
  }

  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
