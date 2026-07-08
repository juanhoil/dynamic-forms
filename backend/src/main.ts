// ---------------------------------------------------------------------------
// Bootstrap de la API NestJS que expone el motor de HyperSchema.
// Sin base de datos: el schema viaja en el body de cada request (stateless).
// ---------------------------------------------------------------------------

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })
  );
  app.enableCors();

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`hyperschema-engine API escuchando en http://localhost:${port}/api`);
}

void bootstrap();
