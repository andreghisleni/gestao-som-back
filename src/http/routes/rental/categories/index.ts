import Elysia from "elysia";
import { createCategoryRoute } from "./create-category-route";
import { getCategoryRoute } from "./get-category-route";
import { listCategoriesRoute } from "./list-categories-route";
import { updateCategoryRoute } from "./update-category-route";

export const categoriesRoutes = new Elysia()
  .use(createCategoryRoute)
  .use(listCategoriesRoute)
  .use(getCategoryRoute)
  .use(updateCategoryRoute);
