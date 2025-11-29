/** biome-ignore-all lint/suspicious/noConsole: <explanation> */
/** biome-ignore-all lint/nursery/noAwaitInLoop: <explanation> */

import { prisma } from "~/db/client";
import { Prisma } from "~/db/generated/prisma/client";

async function main() {
  console.log("💍 Iniciando Seed: Casamento Completo (2 Ambientes)...");

  // 1. BUSCAR EQUIPAMENTOS NO BANCO (Pelo nome aproximado)
  // Precisamos dos IDs e Preços atuais para criar o orçamento
  const findEq = async (namePart: string) => {
    const eq = await prisma.equipment.findFirst({
      where: { name: { contains: namePart, mode: "insensitive" } },
    });
    if (!eq) {
      throw new Error(`Equipamento não encontrado: ${namePart}`);
    }
    return eq;
  };

  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error(
      "Nenhum usuário encontrado. Crie um usuário antes de rodar a seed."
    );
  }

  // Carregando itens do inventário
  const pa12 = await findEq("PA Sub 12");
  const pa18 = await findEq("PA Sub 18");
  const micsSemFio = await findEq("Mics Sem Fio");
  const micsComFio = await findEq("Mics Com Fio");
  const mesaSom = await findEq("Mesa Digital");
  const parLeds = await findEq("Par Leds");
  const fumaca = await findEq("Máquina Fumaça");
  const estrutura = await findEq("Estrutura Q20");
  const mesaDmx = await findEq("Mesa DMX");
  const cabos = await findEq("Cabos Diversos");

  // 2. DEFINIR ESTRUTURA DO ORÇAMENTO
  const clientName = "Casamento Com dois Ambientes";
  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + 30); // Daqui a 30 dias

  // Valores de Serviço
  const laborCost = new Prisma.Decimal(800); // Técnico/Montagem
  const transportCost = new Prisma.Decimal(250); // Frete
  const discount = new Prisma.Decimal(100); // Desconto amigo

  console.log(`📅 Criando orçamento para: ${clientName}`);

  // 3. CRIAR O ORÇAMENTO COM TRANSAÇÃO (Para garantir consistência)
  await prisma.$transaction(async (tx) => {
    // A. Criar Cabeçalho
    const budget = await tx.budget.create({
      data: {
        userId: user.id,
        clientName,
        eventDate,
        status: "APPROVED", // Já aprovado para teste
        laborCost,
        transportCost,
        discount,
        totalValue: 0, // Calcularemos abaixo
        finalValue: 0,
      },
    });

    let totalItemsAcc = new Prisma.Decimal(0);

    // B. Criar Ambiente 1: CERIMÔNIA
    // (PA 12 + Mics Sem Fio)
    const sectionCerimonia = await tx.budgetSection.create({
      data: { name: "Cerimônia (Área Externa)", budgetId: budget.id },
    });

    const itemsCerimonia = [
      { eq: pa12, qty: 1 },
      { eq: micsSemFio, qty: 1 }, // Microfones para os noivos/padre
    ];

    for (const item of itemsCerimonia) {
      const unitPrice = item.eq.rentalPrice || new Prisma.Decimal(0);
      const subtotal = unitPrice.mul(item.qty);
      totalItemsAcc = totalItemsAcc.add(subtotal);

      await tx.budgetItem.create({
        data: {
          sectionId: sectionCerimonia.id,
          equipmentId: item.eq.id,
          quantity: item.qty,
          unitPrice,
          subtotal,
        },
      });
    }

    // C. Criar Ambiente 2: FESTA / RECEPÇÃO
    // (PA 18 + Mesa + Luz + Fumaça + Estrutura + Cabos)
    const sectionFesta = await tx.budgetSection.create({
      data: { name: "Recepção e Pista de Dança", budgetId: budget.id },
    });

    const itemsFesta = [
      { eq: pa18, qty: 1 },
      { eq: mesaSom, qty: 1 },
      { eq: micsComFio, qty: 1 }, // Para discursos/DJ
      { eq: parLeds, qty: 1 }, // Iluminação Cênica
      { eq: mesaDmx, qty: 1 },
      { eq: fumaca, qty: 1 },
      { eq: estrutura, qty: 1 }, // Box truss
      { eq: cabos, qty: 1 }, // Cabeamento geral
    ];

    for (const item of itemsFesta) {
      const unitPrice = item.eq.rentalPrice || new Prisma.Decimal(0);
      const subtotal = unitPrice.mul(item.qty);
      totalItemsAcc = totalItemsAcc.add(subtotal);

      await tx.budgetItem.create({
        data: {
          sectionId: sectionFesta.id,
          equipmentId: item.eq.id,
          quantity: item.qty,
          unitPrice,
          subtotal,
        },
      });
    }

    // D. Atualizar Totais do Orçamento
    const finalValue = totalItemsAcc
      .add(laborCost)
      .add(transportCost)
      .sub(discount);

    await tx.budget.update({
      where: { id: budget.id },
      data: {
        totalValue: totalItemsAcc,
        finalValue,
      },
    });

    console.log(`✅ Orçamento criado com sucesso! ID: ${budget.id}`);
    console.log(`💰 Valor Total Itens: R$ ${totalItemsAcc}`);
    console.log(`🏁 Valor Final (c/ serviços): R$ ${finalValue}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
