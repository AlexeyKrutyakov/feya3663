import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { ApiEnv } from '@feya/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Feya API')
    .setDescription('REST API для стоматологии ИП Родионова Ю.В.')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, documentFactory);

  const configService = app.get(ConfigService<ApiEnv, true>);
  const port = configService.get('PORT', { infer: true });

  await app.listen(port);
  console.log(`API listening on port ${port}`);
  console.log(`Swagger: http://localhost:${port}/docs`);
}

bootstrap();
