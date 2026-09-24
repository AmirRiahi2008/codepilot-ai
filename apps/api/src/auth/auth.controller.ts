import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { AuthService } from './auth.service';
import { AuthGuard, SESSION_COOKIE } from './auth.guard';

class AuthDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() body: AuthDto) {
    await this.auth.register(
      body.name,
      body.email.toLowerCase(),
      body.password,
    );

    return {
      ok: true,
    };
  }

  @Post('login')
  async login(
    @Body() body: AuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token } = await this.auth.login(
      body.email.toLowerCase(),
      body.password,
    );

    this.setCookie(res, token);

    return {
      ok: true,
    };
  }

  @Post('logout')
  logout(
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production'
        ? 'none'
        : 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return {
      ok: true,
    };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(
    @Req() req: Request & { userId: string },
  ) {
    return this.auth.me(req.userId);
  }

  private setCookie(
    res: Response,
    token: string,
  ) {
    const isProduction =
      process.env.NODE_ENV === 'production';

    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,

      // Localhost:
      // SameSite=Lax works without HTTPS.
      //
      // Production:
      // Frontend and API are on different origins,
      // so SameSite=None is required.
      sameSite: isProduction ? 'none' : 'lax',

      secure: isProduction,

      maxAge: 7 * 24 * 60 * 60 * 1000,

      path: '/',
    });
  }
}

