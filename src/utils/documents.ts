/**
 * Validação de documentos brasileiros e contatos.
 *
 * A página pública recebe dados digitados no celular do cliente, sem sessão.
 * Máscara é cosmética: a validade real (dígito verificador) precisa acontecer
 * aqui, no servidor, antes de virar contrato.
 */
/** biome-ignore-all lint/performance/useTopLevelRegex: <explanation> */

export type ContractorType = 'PF' | 'PJ';

/** Remove tudo que não for dígito. Usado antes de persistir. */
export const onlyDigits = (value?: string | null): string =>
  (value ?? '').replace(/\D/g, '');

/** CPF: 11 dígitos + 2 dígitos verificadores. */
export const isValidCpf = (value?: string | null): boolean => {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const digit = (base: string, startWeight: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += Number(base[i]) * (startWeight - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return (
    digit(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    digit(cpf.slice(0, 10), 11) === Number(cpf[10])
  );
};

/** CNPJ: 14 dígitos + 2 dígitos verificadores (pesos 5..2 e 6..2). */
export const isValidCnpj = (value?: string | null): boolean => {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  const weights = (length: number) => {
    const list: number[] = [];
    let weight = length - 7;
    // Pesos do 1º dígito: 5,4,3,2,9,8,7,6,5,4,3,2
    // Pesos do 2º dígito: 6,5,4,3,2,9,8,7,6,5,4,3,2
    // Percorrer de trás para frente com weight-- embaralhava a sequência e
    // rejeitava CNPJ válido (o "529.982.245/0001-25" clássico, por exemplo).
    for (let i = 0; i < length; i++) {
      list[i] = weight;
      weight -= 1;
      if (weight < 2) {
        weight = 9;
      }
    }
    return list;
  };

  const checkDigit = (base: string, length: number) => {
    const list = weights(length);
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(base[i]) * list[i];
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return (
    checkDigit(cnpj, 12) === Number(cnpj[12]) &&
    checkDigit(cnpj, 13) === Number(cnpj[13])
  );
};

export const isValidDocument = (
  value: string | null | undefined,
  type: ContractorType
): boolean => (type === 'PJ' ? isValidCnpj(value) : isValidCpf(value));

/** Tamanho esperado em dígitos, para mensagem de erro objetiva. */
export const documentLength = (type: ContractorType) =>
  type === 'PF' ? 11 : 14;

export const isValidEmail = (value?: string | null): boolean => {
  const email = (value ?? '').trim();
  // Domínio com TLD de 2+ caracteres; sem validação de SPF, só formato.
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email) && email.length <= 160;
};

/** WhatsApp BR: DDD (2) + 8 ou 9 dígitos. */
export const isValidPhone = (value?: string | null): boolean => {
  const digits = onlyDigits(value);
  if (digits.length < 10 || digits.length > 11) {
    return false;
  }
  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99) {
    return false;
  }
  // 9º dígito, quando existe, precisa começar com 9 (regra do plano BR)
  if (digits.length === 11 && digits[2] !== '9') {
    return false;
  }
  return true;
};

/** "89801000" -> "89801-000" apenas para exibição (e-mail/contrato). */
export const formatCep = (value?: string | null): string => {
  const digits = onlyDigits(value);
  return digits.length === 8
    ? `${digits.slice(0, 5)}-${digits.slice(5)}`
    : (value ?? '');
};

export const formatDocument = (value?: string | null): string => {
  const digits = onlyDigits(value);
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  return value ?? '';
};

/** "390.532.128-92" -> "•••.•••.128-92" para exibição parcial. */
export const maskDocument = (value?: string | null): string => {
  const formatted = formatDocument(value);
  if (formatted.length < 11) {
    return formatted;
  }
  return `${'•'.repeat(formatted.length - 8)}${formatted.slice(-8)}`;
};
