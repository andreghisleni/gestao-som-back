import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(5).max(100),
  OTEL_TRACE_EXPORTER_URL: z.string(),
  BETTER_AUTH_URL: z.string(),
  // Origem usada para montar o link público (rota /p/:token) dos orçamentos.
  // Default igual ao trustedOrigins do better-auth para não quebrar o dev.
  PUBLIC_APP_URL: z.string().default("http://localhost:5173"),
  // Janela de "visita" do link público: recarregar dentro dela não conta de
  // novo. 30 minutos é o padrão de sessão das ferramentas de analytics.
  PUBLIC_VIEW_WINDOW_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .default(30),
});
// Faz o "parse" das variáveis de ambiente (process.env) usando o schema definido
const parsedEnv = schema.safeParse(process.env);

// Se a validação falhar, lança um erro com detalhes e encerra a aplicação
if (!parsedEnv.success) {
  // biome-ignore lint/suspicious/noConsole: <explanation>
  console.error(
    "❌ Variáveis de ambiente inválidas:",
    parsedEnv.error.flatten().fieldErrors,
  );

  // Lançar o erro é importante para que a aplicação não inicie com configuração inválida
  throw new Error("Variáveis de ambiente inválidas.");
}

// Exporta as variáveis de ambiente validadas e tipadas
export const env = parsedEnv.data;
