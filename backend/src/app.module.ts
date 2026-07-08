import { Module } from '@nestjs/common';
import { FormsModule } from './forms/forms.module.js';
import { FormConfigModule } from './form-config/form-config.module.js';

@Module({
  imports: [FormConfigModule, FormsModule],
})
export class AppModule {}
