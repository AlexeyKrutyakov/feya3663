import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { apiEnvSchema } from '@feya/shared';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const result = apiEnvSchema.safeParse(config);
        if (!result.success) throw new Error(result.error.message);
        return result.data;
      },
    }),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
