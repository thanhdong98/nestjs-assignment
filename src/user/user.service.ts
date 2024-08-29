import { MailerService } from '@nestjs-modules/mailer';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadGatewayException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Cache } from 'cache-manager';
import { randomBytes } from 'crypto';
import { createWriteStream } from 'fs';
import { ErrorMsgs } from '../common/constants/error';
import { deleteFile, getAvatarBase64 } from '../common/helpers/file';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailerService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async createUser(createUserDto: CreateUserDto) {
    const appName = this.configService.get<string>('APP_NAME');

    const createdUser = await this.prisma.user
      .create({
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
      })
      .catch((err) => {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new ConflictException(ErrorMsgs.EXISTING_EMAIL);
        }
        throw err;
      });

    if (createdUser) {
      const emailRes = await this.mailService.sendMail({
        from: `User management <${this.configService.get<string>('EMAIL_TEMPLATE_USERNAME')}>`,
        to: createdUser.email,
        subject: `[${appName}] Registration successful!`,
        text: `Hi ${createUserDto.firstName} ${createUserDto.lastName},\nThank you for subscribing to our service!\n\nBest Regards!`,
      });
      if (emailRes.rejected.length) throw new BadGatewayException(ErrorMsgs.SEND_EMAIL_FAILED);
    }

    const { email, first_name, last_name, id } = createdUser;
    return {
      id,
      email,
      firstName: first_name,
      lastName: last_name,
    };
  }

  async getDetailUser(id: number) {
    const userInfoBaseUrl = this.configService.get<string>('USER_INFO_BASE_URL');

    const { data } = await this.httpService.axiosRef<{ data: User }>({
      method: 'GET',
      url: `${userInfoBaseUrl}/${id}`,
    });

    return data.data;
  }

  async getUserAvatar(id: number) {
    let fileKey = await this.cacheManager.get<string>(`avatar/${id}`);

    if (!fileKey) {
      const user = await this.prisma.user.findFirst({
        where: {
          id,
        },
        select: {
          avatar: true,
        },
      });
      if (!user) throw new NotFoundException(ErrorMsgs.USER_NOT_EXISTING);

      if (!user.avatar) {
        fileKey = randomBytes(32).toString('hex');
        await this.downloadUserAvatar(
          `${this.configService.get<string>('IMAGE_SERVER_BASE_URL')}/${id}-image.jpg`,
          fileKey
        );
        await this.prisma.user.update({
          where: {
            id,
          },
          data: {
            avatar: fileKey,
          },
        });
      } else {
        fileKey = user.avatar;
      }

      this.cacheManager.set(`avatar/${id}`, fileKey, 0);
    }

    return getAvatarBase64(fileKey);
  }

  async downloadUserAvatar(url: string, filename: string) {
    const writer = createWriteStream(`./assets/avatars/${filename}.png`);

    const response = await this.httpService.axiosRef({
      method: 'GET',
      url,
      responseType: 'stream',
    });

    response.data.pipe(writer);

    return await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  async removeUserAvatar(id: number) {
    let cachedFilepath = await this.cacheManager.get<string>(`avatar/${id}`);

    if (!cachedFilepath) {
      const cacheValue = await this.prisma.user.findFirst({
        where: { id },
        select: { avatar: true },
      });
      if (!cacheValue) throw new NotFoundException(ErrorMsgs.USER_NOT_EXISTING);
      if (!cacheValue.avatar) throw new NotFoundException(ErrorMsgs.EMPTY_AVATAR);
      cachedFilepath = cacheValue.avatar;
    }

    await Promise.all([
      this.prisma.user.update({
        where: {
          id,
        },
        data: {
          avatar: null,
        },
      }),
      this.cacheManager.del(`avatar/${id}`),
      deleteFile(`assets/avatars/${cachedFilepath}.png`),
    ]);

    return true;
  }
}
