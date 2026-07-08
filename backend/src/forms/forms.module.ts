import { Module } from '@nestjs/common';
import { FormConfigModule } from '../form-config/form-config.module.js';
import { FormsController } from './forms.controller.js';
import { FormsService } from './forms.service.js';

@Module({
  imports: [FormConfigModule],
  controllers: [FormsController],
  providers: [FormsService],
})
export class FormsModule {}
