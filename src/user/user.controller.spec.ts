import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('UserController', () => {
  let userController: UserController;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            createUser: jest.fn(),
            getDetailUser: jest.fn(),
            getUserAvatar: jest.fn(),
            removeUserAvatar: jest.fn(),
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

    userController = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  describe('createUser', () => {
    it('should call userService.createUser and return the result', async () => {
      const createUserDto: CreateUserDto = { firstName: 'Dong', lastName: 'Nguyen', email: 'ntdong98.it@gmail.com' };
      const result = { id: 1, ...createUserDto };
      jest.spyOn(userService, 'createUser').mockResolvedValue(result);

      expect(await userController.createUser(createUserDto)).toBe(result);
      expect(userService.createUser).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('getUserDetail', () => {
    it('should call userService.getDetailUser and return the result', async () => {
      const userId = 1;
      const result = { id: userId, firstName: 'Dong', lastName: 'Nguyen', email: 'ntdong98.it@gmail.com' };
      jest.spyOn(userService, 'getDetailUser').mockResolvedValue(result);

      expect(await userController.getUserDetail(userId)).toBe(result);
      expect(userService.getDetailUser).toHaveBeenCalledWith(userId);
    });
  });

  describe('getUserAvatar', () => {
    it('should call userService.getUserAvatar and return the result', async () => {
      const userId = 1;
      const result = 'base64image';
      jest.spyOn(userService, 'getUserAvatar').mockResolvedValue(result);

      expect(await userController.getUserAvatar(userId)).toBe(result);
      expect(userService.getUserAvatar).toHaveBeenCalledWith(userId);
    });
  });

  describe('removeUserAvatar', () => {
    it('should call userService.removeUserAvatar and return the result', async () => {
      const userId = 1;
      jest.spyOn(userService, 'removeUserAvatar').mockResolvedValue(true);

      expect(await userController.removeUserAvatar(userId)).toBe(true);
      expect(userService.removeUserAvatar).toHaveBeenCalledWith(userId);
    });
  });
});
