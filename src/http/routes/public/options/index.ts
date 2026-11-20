import Elysia from 'elysia';
import { getEventFormOptionsRoute } from './get-event-form-options-route';

export const publicOptionsRoutes = new Elysia({ tags: ['Public'] }).use(
  getEventFormOptionsRoute
);
