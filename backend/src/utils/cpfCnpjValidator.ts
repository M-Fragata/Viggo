export function cleanDocument(value: string): string {
  return value.replace(/\D/g, '');
}

function charAt(str: string, index: number): string {
  const char = str.charAt(index);
  return char.length > 0 ? char : '0';
}

export function validateCPF(cpf: string): boolean {
  const cleaned = cleanDocument(cpf);

  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(charAt(cleaned, i)) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;
  if (digit1 !== parseInt(charAt(cleaned, 9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(charAt(cleaned, i)) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;
  if (digit2 !== parseInt(charAt(cleaned, 10))) return false;

  return true;
}

export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cleanDocument(cnpj);
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleaned)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(charAt(cleaned, i)) * (weights1[i] ?? 0);
  }
  let digit1 = sum % 11;
  digit1 = digit1 < 2 ? 0 : 11 - digit1;
  if (digit1 !== parseInt(charAt(cleaned, 12))) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(charAt(cleaned, i)) * (weights2[i] ?? 0);
  }
  let digit2 = sum % 11;
  digit2 = digit2 < 2 ? 0 : 11 - digit2;
  if (digit2 !== parseInt(charAt(cleaned, 13))) return false;

  return true;
}

export function formatCPF(cpf: string): string {
  const cleaned = cleanDocument(cpf);
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatCNPJ(cnpj: string): string {
  const cleaned = cleanDocument(cnpj);
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function detectDocumentType(value: string): 'CPF' | 'CNPJ' | 'INVALID' {
  const cleaned = cleanDocument(value);
  if (cleaned.length === 11) return 'CPF';
  if (cleaned.length === 14) return 'CNPJ';
  return 'INVALID';
}

export function validateDocument(value: string): { valid: boolean; type: 'CPF' | 'CNPJ' | 'INVALID'; formatted: string } {
  const type = detectDocumentType(value);
  const cleaned = cleanDocument(value);

  if (type === 'CPF') {
    return {
      valid: validateCPF(cleaned),
      type: 'CPF',
      formatted: formatCPF(cleaned),
    };
  }

  if (type === 'CNPJ') {
    return {
      valid: validateCNPJ(cleaned),
      type: 'CNPJ',
      formatted: formatCNPJ(cleaned),
    };
  }

  return {
    valid: false,
    type: 'INVALID',
    formatted: value,
  };
}

export function maskCPF(value: string): string {
  const cleaned = cleanDocument(value);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
}

export function maskCNPJ(value: string): string {
  const cleaned = cleanDocument(value);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
  if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
}

export function maskDocument(value: string): string {
  const type = detectDocumentType(value);
  if (type === 'CPF') return maskCPF(value);
  if (type === 'CNPJ') return maskCNPJ(value);
  return value;
}