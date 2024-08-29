import { MailerService } from '@nestjs-modules/mailer';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadGatewayException, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Cache } from 'cache-manager';
import { ErrorMsgs } from '../common/constants/error';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

jest.mock('../common/helpers/file', () => ({
  getAvatarBase64: jest.fn().mockReturnValue('base64data'),
  deleteFile: jest.fn(),
}));

jest.mock('fs', () => ({
  createWriteStream: jest.fn().mockReturnValue({
    on: jest.fn().mockImplementation((event, callback) => {
      if (event === 'finish') {
        callback('test');
      }
    }),
  }),
  existsSync: jest.fn(),
}));

describe('UserService', () => {
  let userService: UserService;
  let prismaService: PrismaService;
  let mailerService: MailerService;
  let httpService: HttpService;
  let configService: ConfigService;
  let cacheManager: Cache;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            axiosRef: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'APP_NAME') return 'TestApp';
              if (key === 'EMAIL_TEMPLATE_USERNAME') return 'noreply@test.com';
              if (key === 'USER_INFO_BASE_URL') return 'https://api.test.com/user';
              return null;
            }),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);
    mailerService = module.get<MailerService>(MailerService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  describe('createUser', () => {
    it('should create a user and send an email', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        firstName: 'Dong',
        lastName: 'Nguyen',
      };

      const createdUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Dong',
        last_name: 'Nguyen',
        created_at: new Date('28/8/2024'),
        modified_at: new Date('28/8/2024'),
        avatar: '',
      };

      jest.spyOn(prismaService.user, 'create').mockResolvedValue(createdUser);
      jest.spyOn(mailerService, 'sendMail').mockResolvedValue({ rejected: [] } as any);

      const result = await userService.createUser(createUserDto);

      expect(result).toEqual({
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.first_name,
        lastName: createdUser.last_name,
      });
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: createUserDto.email,
          first_name: createUserDto.firstName,
          last_name: createUserDto.lastName,
        },
        select: {
          email: true,
          first_name: true,
          last_name: true,
          id: true,
        },
      });
      expect(mailerService.sendMail).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        firstName: 'Dong',
        lastName: 'Nguyen',
      };

      const error = new ConflictException(ErrorMsgs.EXISTING_EMAIL);

      jest.spyOn(prismaService.user, 'create').mockRejectedValue(error);

      await expect(userService.createUser(createUserDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadGatewayException if email sending fails', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        firstName: 'Dong',
        lastName: 'Nguyen',
      };

      const createdUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Dong',
        last_name: 'Nguyen',
        created_at: new Date('28/8/2024'),
        modified_at: new Date('28/8/2024'),
        avatar: '',
      };

      jest.spyOn(prismaService.user, 'create').mockResolvedValue(createdUser);
      jest
        .spyOn(mailerService, 'sendMail')
        .mockImplementation(() => Promise.resolve({ rejected: ['test@example.com'] }));

      await expect(userService.createUser(createUserDto)).rejects.toThrow(BadGatewayException);
    });

    it('should throw BadGatewayException if email sending fails', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        firstName: 'Dong',
        lastName: 'Nguyen',
      };

      const conflictException = new PrismaClientKnownRequestError('conflict', {
        code: 'P2002',
        clientVersion: '',
      });
      jest.spyOn(prismaService.user, 'create').mockRejectedValue(conflictException);
      jest
        .spyOn(mailerService, 'sendMail')
        .mockImplementation(() => Promise.resolve({ rejected: ['test@example.com'] }));

      await expect(userService.createUser(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('getDetailUser', () => {
    it('should return user details from external API', async () => {
      const mockUser: User = { id: 1, email: 'test@example.com', firstName: 'John', lastName: 'Doe' };
      const response: AxiosResponse<{ data: User }> = {
        data: { data: mockUser },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };

      jest.spyOn(httpService, 'axiosRef').mockResolvedValue(response);

      const result = await userService.getDetailUser(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(httpService.axiosRef).toHaveBeenCalledWith({
        method: 'GET',
        url: `https://api.test.com/user/${mockUser.id}`,
      });
    });

    it('should throw an error if the HTTP request fails', async () => {
      jest.spyOn(httpService, 'axiosRef').mockRejectedValue(new Error('An error happened'));

      await expect(userService.getDetailUser(1)).rejects.toThrow(Error);
    });
  });

  describe('getUserAvatar', () => {
    it('should return avatar base64 if found in cache', async () => {
      const userId = 1;
      const fileKey = 'test-key';
      jest.spyOn(cacheManager, 'get').mockResolvedValue(fileKey);

      const result = await userService.getUserAvatar(userId);

      expect(result).toBe('base64data');
      expect(cacheManager.get).toHaveBeenCalledWith(`avatar/${userId}`);
    });

    it('should download avatar if not cached and return base64', async () => {
      const userId = 1;
      const fileKey = 'test-key';
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue({ avatar: fileKey } as any);

      const result = await userService.getUserAvatar(userId);

      expect(result).toBe('base64data');
      expect(prismaService.user.findFirst).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith('avatar/1', 'test-key', 0);
    });

    it('should throw not found when cached file null and no user found', async () => {
      const userId = 1;
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      await expect(userService.getUserAvatar(userId)).rejects.toThrow(NotFoundException);
      expect(prismaService.user.findFirst).toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should download avatar and store new file', async () => {
      const userId = 1;

      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue({ avatar: null } as any);
      jest.spyOn(userService, 'downloadUserAvatar').mockResolvedValue('success');

      const result = await userService.getUserAvatar(userId);

      expect(result).toBe('base64data');
      expect(userService.downloadUserAvatar).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should re-cache file name ', async () => {
      const userId = 1;
      const fileKey = 'test-file-name';

      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue({ avatar: fileKey } as any);
      jest.spyOn(userService, 'downloadUserAvatar').mockResolvedValue('success');

      const result = await userService.getUserAvatar(userId);

      expect(result).toBe('base64data');
      expect(userService.downloadUserAvatar).not.toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(`avatar/${userId}`, fileKey, 0);
    });
  });

  describe('removeUserAvatar', () => {
    it("should remove the user's avatar successfully", async () => {
      const id = 1;
      const avatarPath = 'avatar-path';

      jest.spyOn(cacheManager, 'get').mockResolvedValue(avatarPath);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({} as any);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      const result = await userService.removeUserAvatar(id);

      expect(result).toBe(true);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id },
        data: { avatar: null },
      });
      expect(cacheManager.del).toHaveBeenCalledWith(`avatar/${id}`);
    });

    it('should retrieve filename and remove', async () => {
      const id = 1;
      const avatarPath = 'avatar-path';

      jest.spyOn(cacheManager, 'get').mockResolvedValue(avatarPath);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({} as any);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      const result = await userService.removeUserAvatar(id);

      expect(result).toBe(true);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id },
        data: { avatar: null },
      });
      expect(cacheManager.del).toHaveBeenCalledWith(`avatar/${id}`);
    });

    it('should retrieve filename from db and remove', async () => {
      const id = 1;
      const avatarPath = 'avatar-path';

      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue({ avatar: avatarPath } as any);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({} as any);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      const result = await userService.removeUserAvatar(id);

      expect(result).toBe(true);
      expect(prismaService.user.findFirst).toHaveBeenCalled();
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id },
        data: { avatar: null },
      });
      expect(cacheManager.del).toHaveBeenCalledWith(`avatar/${id}`);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const id = 1;

      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      await expect(userService.removeUserAvatar(id)).rejects.toThrow(
        new NotFoundException(ErrorMsgs.USER_NOT_EXISTING)
      );
    });

    it('should throw NotFoundException if avatar is empty', async () => {
      const id = 1;

      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue({ avatar: null } as any);

      await expect(userService.removeUserAvatar(id)).rejects.toThrow(new NotFoundException(ErrorMsgs.EMPTY_AVATAR));
    });
  });

  describe('downloadUserAvatar', () => {
    it('should download the user avatar and save it to the file system successfully', async () => {
      const url = 'http://example.com/avatar.png';
      const filename = 'test-avatar';

      const mockResponse = {
        data: {
          pipe: jest.fn(),
        },
      } as unknown as AxiosResponse;

      jest.spyOn(httpService, 'axiosRef').mockResolvedValue(mockResponse);

      const res = await userService.downloadUserAvatar(url, filename);

      expect(res).toEqual('test');
      expect(httpService.axiosRef).toHaveBeenCalledWith({
        method: 'GET',
        url,
        responseType: 'stream',
      });
    });
  });
});
