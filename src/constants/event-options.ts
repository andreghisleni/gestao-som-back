/**
 * Catálogos de opções do formulário público.
 *
 * Ficam no servidor de propósito: a página pública e a tela interna precisam
 * das mesmas constantes, e assim dá para adicionar um estilo musical novo sem
 * publicar um novo front. Os valores persistidos são os `id` (stables, em
 * inglês); os `label` são o que o cliente lê.
 */
/** biome-ignore-all lint/complexity/useOptionalChain: <explanation> */

export type Option = {
  id: string;
  label: string;
  hint?: string;
};

/** Estilo musical. Pensado para som + karaokê, não para Spotify. */
export const MUSIC_STYLES = [
  { id: 'sertanejo', label: 'Sertanejo / Universitário' },
  { id: 'forro', label: 'Forró / Piseiro' },
  { id: 'funk', label: 'Funk' },
  { id: 'pagode', label: 'Pagode / Samba' },
  { id: 'mpb', label: 'MPB' },
  { id: 'pop_internacional', label: 'Pop internacional' },
  { id: 'rock', label: 'Rock / Nacional' },
  { id: 'eletronica', label: 'Eletrônica / Dance' },
  { id: 'axé', label: 'Axé' },
  { id: 'flashback', label: 'Flashback (anos 70/80/90)' },
  { id: 'italianas', label: 'Músicas italianas' },
  { id: 'gospel', label: 'Gospel' },
  { id: 'kpop', label: 'K-pop' },
  { id: 'infantil', label: 'Infantil' },
  { id: 'classica', label: 'Clássica / Instrumental (cerimônia)' },
  { id: 'karaoke', label: 'Karaokê (variado)' },
  { id: 'variedade', label: 'Variedade — vale tudo' },
] as const satisfies readonly Option[];

export const EVENT_TYPES = [
  { id: 'casamento', label: 'Casamento' },
  { id: 'aniversario', label: 'Aniversário / 15 anos' },
  { id: 'formatura', label: 'Formatura' },
  { id: 'corporativo', label: 'Corporativo' },
  { id: 'festa_karaoke', label: 'Festa privada com karaokê' },
  { id: 'baile', label: 'Baile / Festa dançante' },
  { id: 'culto', label: 'Culto / Evento religioso' },
  { id: 'outro', label: 'Outro' },
] as const satisfies readonly Option[];

/** Restrições do espaço que mudam a logística da equipe. */
export const ACCESS_NOTES = [
  {
    id: 'portao_amplo',
    label: 'Portão amplo / caminhão encosta',
    hint: 'Descarga direta, sem carrinho',
  },
  {
    id: 'elevador_servico',
    label: 'Elevador de serviço disponível',
    hint: 'Necessário para salões acima do térreo',
  },
  {
    id: 'estacionamento_proximo',
    label: 'Estacionamento próximo',
    hint: 'Para a equipe',
  },
  {
    id: 'restricao_horario',
    label: 'Restrição de horário para montagem',
    hint: 'O local limita o horário de carga',
  },
  {
    id: 'escada_sem_elevador',
    label: 'Só escada / sobe por escada',
    hint: 'Impacta tempo e equipe de montagem',
  },
  {
    id: 'zona_azul',
    label: 'Precisa de autorização de zona azul / permit',
    hint: 'Camioneta na rua',
  },
] as const satisfies readonly Option[];

export const POWER_SUPPLY = [
  { id: 'bivolt_ok', label: 'Tomadas 220V e quadro próximo ao palco' },
  { id: 'somente_110', label: 'Só tenho 110V no local' },
  { id: 'verificar', label: 'Preciso verificar com o salão' },
  { id: 'sem_energia', label: 'Sem energia — vou precisar de gerador' },
] as const satisfies readonly Option[];

export const INTERNET_AVAILABILITY = [
  {
    id: 'yes',
    label: 'Tem internet no local (Wi-Fi liberado para a equipe)',
    hint: 'Necessária para o catálogo de karaokê',
  },
  {
    id: 'no',
    label: 'Não tem internet',
    hint: 'Levamos playlist baixada; karaokê fica limitado',
  },
  {
    id: 'to_verify',
    label: 'Não sei, preciso confirmar com o salão',
  },
] as const satisfies readonly Option[];

export const VENUE_SIZES = [
  { id: 'ate_100', label: 'Até 100 m²' },
  { id: '100_300', label: '100 a 300 m²' },
  { id: 'acima_300', label: 'Acima de 300 m²' },
  { id: 'ar_livre', label: 'Ao ar livre' },
] as const satisfies readonly Option[];

/** Flexibilidade real do horário de início (casamento religioso atrasa). */
export const STARTS_FLEXIBILITY = [
  {
    id: 'rigid',
    label: 'Imprevisível',
    hint: 'Cerimônia que depende do ritmo dos noivos',
  },
  { id: 'plus_30', label: '± 30 min' },
  { id: 'no_exact_time', label: 'Sem hora exata' },
] as const satisfies readonly Option[];

/**
 * Pedidos além do que já está na proposta. NÃO têm preço aqui: a página
 * pública não expõe valores detalhados, então isto é intenção, não cotação.
 */
export const REQUEST_EXTRAS = [
  { id: 'telao', label: 'Televisor / telão para as letras' },
  { id: 'microfone_extra', label: 'Microfone extra' },
  { id: 'iluminacao_ambiente', label: 'Iluminação ambiente' },
  { id: 'fumaca', label: 'Máquina de fumaça / efeitos' },
  { id: 'estrutura', label: 'Estrutura / treliça' },
  { id: 'retorno', label: 'Retorno de palco / podium' },
  { id: 'pacote_karaoke_extra', label: 'Pacote de karaokê maior' },
] as const satisfies readonly Option[];

export const CONTRACTOR_TYPES = [
  { id: 'PF', label: 'Pessoa física' },
  { id: 'PJ', label: 'Pessoa jurídica' },
] as const satisfies readonly Option[];

const catalogs = {
  musicStyles: MUSIC_STYLES,
  eventTypes: EVENT_TYPES,
  accessNotes: ACCESS_NOTES,
  powerSupply: POWER_SUPPLY,
  internetAvailability: INTERNET_AVAILABILITY,
  venueSizes: VENUE_SIZES,
  startsFlexibility: STARTS_FLEXIBILITY,
  requestedExtras: REQUEST_EXTRAS,
  contractorTypes: CONTRACTOR_TYPES,
} as const;

export const FORM_OPTIONS = catalogs;

export type FormOptionsKey = keyof typeof catalogs;

/**
 * Payload mutável das listas. Os catálogos são `as const` (tipos literais e
 * arrays readonly), e o Elysia compara o retorno do handler com o `t.Array`
 * declarado na resposta — readonly não é assignável a array mutável, então a
 * rota serve esta cópia em vez de `FORM_OPTIONS` cru.
 */
export type FormOptionsPayload = Record<FormOptionsKey, Option[]>;

const toMutableOptions = (options: readonly Option[]): Option[] =>
  options.map((option) => ({ ...option }));

export const formOptionsPayload = (): FormOptionsPayload => ({
  musicStyles: toMutableOptions(catalogs.musicStyles),
  eventTypes: toMutableOptions(catalogs.eventTypes),
  accessNotes: toMutableOptions(catalogs.accessNotes),
  powerSupply: toMutableOptions(catalogs.powerSupply),
  internetAvailability: toMutableOptions(catalogs.internetAvailability),
  venueSizes: toMutableOptions(catalogs.venueSizes),
  startsFlexibility: toMutableOptions(catalogs.startsFlexibility),
  requestedExtras: toMutableOptions(catalogs.requestedExtras),
  contractorTypes: toMutableOptions(catalogs.contractorTypes),
});

/** Todos os ids de um catálogo, para validar no body da API. */
export const optionIds = <K extends FormOptionsKey>(key: K) =>
  catalogs[key].map((option) => option.id) as string[];

/** O valor enviado pelo cliente precisa existir no catálogo. */
export const isKnownOption = (
  key: FormOptionsKey,
  value: string | null | undefined
): boolean => value != null && optionIds(key).includes(value);

export const isKnownOptionList = (
  key: FormOptionsKey,
  values: string[] | null | undefined
): boolean =>
  values != null && values.every((value) => isKnownOption(key, value));

/** Traduz ids persistidos de volta para texto legível (e-mail/contrato). */
export const labelsFor = (
  key: FormOptionsKey,
  values: string[] | null | undefined
): string[] =>
  (values ?? []).flatMap((value) => {
    const label = catalogs[key].find((option) => option.id === value)?.label;
    return label ? [label] : [];
  });

export const labelFor = (
  key: FormOptionsKey,
  value: string | null | undefined
): string | null =>
  value == null
    ? null
    : (catalogs[key].find((option) => option.id === value)?.label ?? null);
