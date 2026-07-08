import { Module } from '@nestjs/common';
import { FormConfigController } from './form-config.controller.js';
import { FormConfigService } from './form-config.service.js';

@Module({
  controllers: [FormConfigController],
  providers: [FormConfigService],
  exports: [FormConfigService],
})
export class FormConfigModule {}
