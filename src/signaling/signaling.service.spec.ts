import { Test, TestingModule } from '@nestjs/testing';
import { SignalingService } from './signaling.service';

describe('SignalingService', () => {
  let service: SignalingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignalingService],
    }).compile();

    service = module.get<SignalingService>(SignalingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Currently the SignalingService is just a placeholder with no functionality,
  // so we just test that it can be instantiated.
  // As functionality is added to this service, appropriate tests should be added.
});
