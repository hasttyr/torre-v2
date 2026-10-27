import { Module } from '@nestjs/common';
import { DocsController, SystemController } from './system.controller.js';

/** Contract smoke test (`ping`) and the OpenAPI document (US-008). */
@Module({ controllers: [SystemController, DocsController] })
export class SystemModule {}
