import { base44 } from '@/api/base44Client';

/**
 * Salva endereço(s) do associado na entidade Associate.
 * @param {string} associateId
 * @param {object} form - campos com prefixo shipping_ e billing_
 */
export async function saveAssociateAddress(associateId, form) {
  const payload = {
    shipping_zip: form.shipping_zip || '',
    shipping_street: form.shipping_street || '',
    shipping_number: form.shipping_number || '',
    shipping_complement: form.shipping_complement || '',
    shipping_neighborhood: form.shipping_neighborhood || '',
    shipping_city: form.shipping_city || '',
    shipping_state: form.shipping_state || '',
    billing_same_as_shipping: form.billing_same_as_shipping !== false,
  };

  if (payload.billing_same_as_shipping) {
    payload.billing_zip = payload.shipping_zip;
    payload.billing_street = payload.shipping_street;
    payload.billing_number = payload.shipping_number;
    payload.billing_complement = payload.shipping_complement;
    payload.billing_neighborhood = payload.shipping_neighborhood;
    payload.billing_city = payload.shipping_city;
    payload.billing_state = payload.shipping_state;
  } else {
    payload.billing_zip = form.billing_zip || '';
    payload.billing_street = form.billing_street || '';
    payload.billing_number = form.billing_number || '';
    payload.billing_complement = form.billing_complement || '';
    payload.billing_neighborhood = form.billing_neighborhood || '';
    payload.billing_city = form.billing_city || '';
    payload.billing_state = form.billing_state || '';
  }

  payload.addresses_completed = !!(payload.shipping_zip && payload.shipping_street);

  await base44.entities.Associate.update(associateId, payload);
  return payload;
}

/**
 * Extrai campos de endereço de um objeto Associate para popular o form.
 */
export function addressFormFromAssociate(associate) {
  return {
    shipping_zip: associate.shipping_zip || '',
    shipping_street: associate.shipping_street || '',
    shipping_number: associate.shipping_number || '',
    shipping_complement: associate.shipping_complement || '',
    shipping_neighborhood: associate.shipping_neighborhood || '',
    shipping_city: associate.shipping_city || '',
    shipping_state: associate.shipping_state || '',
    billing_same_as_shipping: associate.billing_same_as_shipping !== false,
    billing_zip: associate.billing_zip || '',
    billing_street: associate.billing_street || '',
    billing_number: associate.billing_number || '',
    billing_complement: associate.billing_complement || '',
    billing_neighborhood: associate.billing_neighborhood || '',
    billing_city: associate.billing_city || '',
    billing_state: associate.billing_state || '',
  };
}