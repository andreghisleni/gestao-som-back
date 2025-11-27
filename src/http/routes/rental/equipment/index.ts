import Elysia from 'elysia';
import { createEquipmentRoute } from './create-equipment-route';
import { listEquipmentRoute } from './list-equipment-route';
import { updateEquipmentRoute } from './update-equipment-route';

export const equipment = new Elysia({ prefix: '/equipment', name: 'Equipment', tags: ['Rental', 'Equipment'] })
  .use(createEquipmentRoute)
  .use(listEquipmentRoute)
  .use(updateEquipmentRoute);
