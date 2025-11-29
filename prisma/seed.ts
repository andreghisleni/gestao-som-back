/** biome-ignore-all lint/nursery/noAwaitInLoop: <explanation> */
/** biome-ignore-all lint/suspicious/noConsole: <explanation> */

import { prisma } from "~/db/client";
import { Prisma } from "~/db/generated/prisma/client";

async function main() {
  console.log("🌱 Iniciando o Seed do Banco de Dados...");

  // --- 1. DEFINIÇÃO DAS CATEGORIAS ---
  const categoriesData = [
    { name: "Som (Principal)", rentalPercent: 4.0 },
    { name: "Áudio (Periféricos)", rentalPercent: 5.0 },
    { name: "Áudio (Monitor)", rentalPercent: 4.0 },
    { name: "Iluminação", rentalPercent: 7.0 },
    { name: "Estrutura", rentalPercent: 7.0 },
    { name: "Cabos", rentalPercent: 8.0 },
  ];

  const categoriesMap = new Map<string, string>();

  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: { rentalPercent: cat.rentalPercent },
      create: { name: cat.name, rentalPercent: cat.rentalPercent },
    });
    categoriesMap.set(cat.name, created.id);
    console.log(`✅ Categoria criada/atualizada: ${cat.name}`);
  }

  // --- 2. DEFINIÇÃO DOS EQUIPAMENTOS ---
  // Formato: [Nome, Categoria, PreçoCompra (Number), Quantidade]
  const equipmentsData: [string, string, number, number][] = [
    // Som Principal (4%)
    ['PA Sub 12" (par LR completo)', "Som (Principal)", 8000, 1],
    ['PA Sub 18" (par LR + lines)', "Som (Principal)", 15_000, 1],

    // Periféricos (5%)
    ["Mesa Digital Behringer XR18", "Áudio (Periféricos)", 7000, 1],
    ["Mics Sem Fio Phenyx Pro (4un)", "Áudio (Periféricos)", 4800, 1],
    ["Mics Com Fio Dylain (2un)", "Áudio (Periféricos)", 700, 1],

    // Monitor (4%)
    ["Par Retornos Antigos", "Áudio (Monitor)", 3000, 1],

    // Iluminação (7%)
    ["Par Leds (10un)", "Iluminação", 1500, 1],
    ["Máquina Fumaça 2000W", "Iluminação", 800, 1],
    ["Mesa DMX Artnet", "Iluminação", 800, 1],
    ["Spyder", "Iluminação", 500, 1],

    // Estrutura (7%)
    ["Estrutura Q20 (12m)", "Estrutura", 2000, 1],

    // Cabos (8%)
    ["Multicabo 12 Vias", "Cabos", 600, 1],
    ["Cabos Diversos", "Cabos", 2000, 1],
  ];

  for (const [name, catName, price, qty] of equipmentsData) {
    const categoryId = categoriesMap.get(catName);

    if (!categoryId) {
      console.warn(`⚠️ Categoria não encontrada para: ${name}`);
      continue;
    }

    // Busca a porcentagem para calcular o aluguel
    const category = categoriesData.find((c) => c.name === catName);
    const percent = category?.rentalPercent || 0;

    // Cálculos com Prisma.Decimal
    const purchasePriceDecimal = new Prisma.Decimal(price);
    const rentalPriceDecimal = purchasePriceDecimal.mul(percent).div(100);

    await prisma.equipment.create({
      data: {
        name,
        categoryId,
        stockQuantity: qty,
        purchasePrice: purchasePriceDecimal,
        rentalPrice: rentalPriceDecimal,
      },
    });

    console.log(
      `📦 Equipamento criado: ${name} (Aluguel: R$ ${rentalPriceDecimal})`
    );
  }

  console.log("🏁 Seed finalizado com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
