import { Env } from '../utils/environment.js';

const ASAAS_BASE_URL = Env.ASAAS_ENVIRONMENT === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_HEADERS = {
  'Content-Type': 'application/json',
  'access_token': Env.ASAAS_API_KEY!,
};

// ===== CUSTOMERS =====

export interface CreateCustomerDTO {
  name: string;
  cpfCnpj: string;
  email: string;
  phone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  city?: string;
  state?: string;
}

export async function createCustomer(data: CreateCustomerDTO): Promise<{ id: string; name: string }> {
  const response = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: 'POST',
    headers: ASAAS_HEADERS,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas createCustomer failed: ${JSON.stringify(error)}`);
  }

  return response.json() as Promise<{ id: string; name: string }>;
}

// ===== SUBSCRIPTIONS (Cobrança Recorrente) =====

export interface CreateSubscriptionDTO {
  customerId: string;
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  value: number;
  cycle?: 'MONTHLY';
  description: string;
  externalReference?: string;
  nextDueDate?: string;
}

export async function createSubscription(data: CreateSubscriptionDTO): Promise<{ id: string; invoiceUrl?: string; paymentUrl?: string }> {
  const response = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
    method: 'POST',
    headers: ASAAS_HEADERS,
    body: JSON.stringify({
      cycle: 'MONTHLY',
      ...data,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas createSubscription failed: ${JSON.stringify(error)}`);
  }

  return response.json() as Promise<{ id: string; invoiceUrl?: string; paymentUrl?: string }>;
}

export async function updateSubscription(subscriptionId: string, data: { value?: number; status?: string }) {
  const response = await fetch(`${ASAAS_BASE_URL}/subscriptions/${subscriptionId}`, {
    method: 'PUT',
    headers: ASAAS_HEADERS,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas updateSubscription failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

export async function cancelSubscription(subscriptionId: string) {
  const response = await fetch(`${ASAAS_BASE_URL}/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: ASAAS_HEADERS,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas cancelSubscription failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// ===== PAYMENTS (Cobrança Avulsa) =====

export interface CreatePaymentDTO {
  customerId: string;
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
}

export async function createPayment(data: CreatePaymentDTO) {
  const response = await fetch(`${ASAAS_BASE_URL}/payments`, {
    method: 'POST',
    headers: ASAAS_HEADERS,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas createPayment failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

export async function getPayment(paymentId: string) {
  const response = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, {
    method: 'GET',
    headers: ASAAS_HEADERS,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas getPayment failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

export async function getPaymentsByCustomer(customerId: string, limit = 50) {
  const response = await fetch(
    `${ASAAS_BASE_URL}/payments?customer=${customerId}&limit=${limit}&orderBy=dueDate desc`,
    { method: 'GET', headers: ASAAS_HEADERS }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas getPayments failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// ===== WEBHOOK VALIDATION =====

export function validateWebhookToken(token: string): boolean {
  return token === Env.ASAAS_WEBHOOK_TOKEN;
}

// ===== TYPES PARA WEBHOOK =====

export interface AsaasWebhookEvent {
  event: string;
  payment: {
    id: string;
    customer: string;
    subscription: string;
    status: string;
    value: number;
    billingType: string;
    dueDate: string;
    paymentDate?: string;
    externalReference?: string;
  };
}
