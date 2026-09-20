import { Elysia } from 'elysia';

import { errorHandler } from './middleware/errorHandler';
import { apiModule } from './modules';

export const app = new Elysia({ aot: false }).use(errorHandler).use(apiModule);
