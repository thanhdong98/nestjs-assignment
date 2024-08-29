import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    CacheModule.register({ isGlobal: true }),
    ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),
    UserModule,
    PrismaModule,
  ],
  controllers: [AppController],
})
export class AppModule {
  constructor() {}
}
