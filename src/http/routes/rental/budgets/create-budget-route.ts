import { randomUUID } from 'node:crypto';
import Elysia, { t } from 'elysia';
import { authMacro } from '~/auth';
import { prisma } from '~/db/client';

export const createBudgetRoute = new Elysia().macro(authMacro).post(
  '/',
  async ({ user, body }) => {
    const { clientName, eventDate, sections } = body;

    const result = await prisma.$transaction(async (tx) => {
      const budget = await tx.budget.create({
        data: {
          clientName,
          eventDate: new Date(eventDate),
          status: 'DRAFT',
          totalValue: '0',
          discount: '0',
          finalValue: '0',
          createdById: user.id,
        },
      });

      type SectionInput = {
        name: string;
        items?: { equipmentId: string; quantity?: number }[];
      };
      type ItemRecord = {
        id: string;
        sectionId: string;
        equipmentId: string;
        quantity: number;
        unitPrice: string;
        subtotal: string;
      };

      const sectionsInput = (sections ?? []) as SectionInput[];

      // buscar todos os equipamentos usados numa única query
      const equipmentIds = Array.from(
        new Set(
          sectionsInput.flatMap((s) =>
            (s.items ?? []).map((it) => it.equipmentId)
          )
        )
      );

      const equipments = await tx.equipment.findMany({
        where: { id: { in: equipmentIds as string[] } },
      });
      const eqMap = new Map(equipments.map((e) => [e.id, e]));

      // gerar registros com ids locais para poder usar createMany
      const sectionRecords = sectionsInput.map((s) => ({
        id: randomUUID(),
        name: s.name,
        budgetId: budget.id,
      }));

      const itemRecords: ItemRecord[] = sectionsInput.flatMap((s, idx) => {
        const sectionId = sectionRecords[idx].id;
        return (s.items ?? []).map((it) => {
          const equipment = eqMap.get(it.equipmentId);
          if (!equipment) {
            throw new Error(`Equipment ${it.equipmentId} not found`);
          }

          const unitPrice = Number(
            equipment.baseRentalPrice ?? equipment.purchasePrice ?? 0
          );
          const quantity = Number(it.quantity ?? 0);
          const subtotal = unitPrice * quantity;

          return {
            id: randomUUID(),
            sectionId,
            equipmentId: it.equipmentId,
            quantity,
            unitPrice: String(unitPrice),
            subtotal: String(subtotal),
          };
        });
      });

      const total = itemRecords.reduce(
        (acc, it) => acc + Number(it.subtotal),
        0
      );
      const final = total;

      // cria seções e itens em massa
      if (sectionRecords.length) {
        await tx.budgetSection.createMany({ data: sectionRecords });
      }
      if (itemRecords.length) {
        await tx.budgetItem.createMany({ data: itemRecords });
      }

      await tx.budget.update({
        where: { id: budget.id },
        data: { totalValue: String(total), finalValue: String(final) },
      });

      const full = await tx.budget.findUnique({
        where: { id: budget.id },
        include: {
          sections: { include: { items: { include: { equipment: true } } } },
          createdBy: true,
        },
      });

      return full;
    });

    // retornar id criado de forma simples
    return { id: result?.id ?? '' };
  },
  {
    auth: true,
    body: t.Object({
      clientName: t.String(),
      eventDate: t.String(),
      sections: t.Optional(
        t.Array(
          t.Object({
            name: t.String(),
            items: t.Array(
              t.Object({ equipmentId: t.String(), quantity: t.Number() })
            ),
          })
        )
      ),
    }),
    response: {
      201: t.Object({ id: t.String() }),
      400: t.Object({ error: t.String() }),
    },
  }
);
