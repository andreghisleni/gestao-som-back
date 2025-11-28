import Elysia from 'elysia';
import { createEquipmentRoute } from './create-equipment-route';
import { getEquipmentRoute } from './get-equipment-route';
import { listEquipmentRoute } from './list-equipment-route';
import { updateEquipmentRoute } from './update-equipment-route';

export const equipmentRoutes = new Elysia()
  .use(createEquipmentRoute)
  .use(listEquipmentRoute)
  .use(getEquipmentRoute)
  .use(updateEquipmentRoute);
