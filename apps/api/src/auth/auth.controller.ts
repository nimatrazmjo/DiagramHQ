import { Body, Controller, Get, HttpCode, HttpStatus, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { AuthTokenPayload } from '@diagramhq/domain';
import { LoginDto } from './auth.dto';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('token')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto): { token: string; user: { id: string; email: string; name: string } } {
    const user = this.authService.validateCredentials(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.authService.signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
    });

    return { token, user };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: AuthTokenPayload): { user: AuthTokenPayload } {
    return { user };
  }
}
