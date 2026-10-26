// Entry point of @torre/api.
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { APP_OPTIONS, configureApp } from './app.setup.js';
import { AppConfig } from './config/app-config.js';

async function bootstrap(): Promise<void> {
  const app = configureApp(await NestFactory.create<NestExpressApplication>(await AppModule.forRoot(), APP_OPTIONS));
  await app.listen(app.get(AppConfig).get('PORT'));
}

await bootstrap();
