/** biome-ignore-all lint/suspicious/noConsole: <explanation> */
/** biome-ignore-all lint/nursery/noAwaitInLoop: <explanation> */

import { prisma } from "~/db/client";

async function main() {
  console.log("📝 Atualizando Descrições das Categorias...");

  const categoriesData = [
    {
      name: "Som (Principal)",
      description:
        "Equipamentos caros e de alta prioridade. PA's, Subs, Lines e Amplificação.",
    },
    {
      name: "Áudio (Periféricos)",
      description:
        "Itens essenciais que geram valor. Mesas digitais, Microfones (com/sem fio) e processadores.",
    },
    {
      name: "Áudio (Monitor)",
      description:
        "Retornos de chão, fones in-ear e sistemas de monitoramento para músicos.",
    },
    {
      name: "Iluminação",
      description:
        "Itens de grande volume visual. Par Leds, Moving Heads, Fumaça, Lasers e mesas DMX.",
    },
    {
      name: "Estrutura",
      description:
        "Logística pesada. Box Truss (Q20/Q30), bases, torres e suportes.",
    },
    {
      name: "Cabos",
      description:
        "Itens de alto desgaste. Cabos XLR, AC, Multicabos e adaptadores.",
    },
  ];

  for (const cat of categoriesData) {
    // Usamos updateMany para garantir que atualiza se o nome bater,
    // ou upsert se você preferir garantir a criação.
    // Como as categorias já existem do seed anterior, vamos focar em atualizar.

    const category = await prisma.category.findUnique({
      where: { name: cat.name },
    });

    if (category) {
      await prisma.category.update({
        where: { id: category.id },
        data: { description: cat.description },
      });
      console.log(`✅ Descrição atualizada: ${cat.name}`);
    } else {
      console.log(`⚠️ Categoria não encontrada para atualizar: ${cat.name}`);
    }
  }

  console.log("🏁 Atualização concluída!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
