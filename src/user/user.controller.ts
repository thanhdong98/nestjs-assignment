import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseInterceptors } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('user')
@UseInterceptors(CacheInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    return await this.userService.createUser(createUserDto);
  }

  @Get(':userId')
  async getUserDetail(@Param('userId', ParseIntPipe) userId: number) {
    return await this.userService.getDetailUser(userId);
  }

  @Get(':userId/avatar')
  async getUserAvatar(@Param('userId', ParseIntPipe) userId: number) {
    return await this.userService.getUserAvatar(userId);
  }

  @Delete(':userId/avatar')
  async removeUserAvatar(@Param('userId', ParseIntPipe) userId: number) {
    return await this.userService.removeUserAvatar(userId);
  }
}
